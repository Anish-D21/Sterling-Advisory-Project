/**
 * routes/advisor.js — Sterling Advisory Financial API Routes
 * Server-side computation endpoints (validate + compute)
 * All amounts in INR ₹
 */

const express = require('express');
const User    = require('../models/User');
const { protect } = require('./auth');
const router  = express.Router();

// ══════════════════════════════════════════════════════════════
//  FINANCIAL FORMULA LIBRARY (Server-side, mirrors calculator.js)
// ══════════════════════════════════════════════════════════════

/**
 * EMI — Reducing Balance Method
 */
function calcEMI(principal, annualRate, tenureMonths) {
  const r = annualRate / 12 / 100;
  if (r === 0) return principal / tenureMonths;
  return principal * r * Math.pow(1+r, tenureMonths) / (Math.pow(1+r, tenureMonths) - 1);
}

function calcDisbursal(principal, feePercent, includeGST = true) {
  const fee = (feePercent / 100) * principal;
  return principal - fee - (includeGST ? fee * 0.18 : 0);
}

function calcFOIR(totalEMIs, income) {
  return income > 0 ? (totalEMIs / income) * 100 : 0;
}

function calcInflationFV(pv, years, rate = 0.06) {
  return pv * Math.pow(1 + rate, years);
}

function calcRequiredSIP(target, cagr, months) {
  const r = cagr / 12 / 100;
  return target * r / ((Math.pow(1+r, months) - 1) * (1 + r));
}

function generateAmortization(principal, annualRate, months) {
  const r = annualRate / 12 / 100;
  const emi = calcEMI(principal, annualRate, months);
  const schedule = [];
  let balance = principal;
  for (let m = 1; m <= months; m++) {
    const interestComp  = balance * r;
    const principalComp = emi - interestComp;
    balance = Math.max(0, balance - principalComp);
    schedule.push({ month: m, emi, principal: principalComp, interest: interestComp, balance });
  }
  return schedule;
}

// ──────────────────────────────────────────────────────────────
//  POST /api/advisor/emi
//  Compute EMI, disbursal, amortization schedule
// ──────────────────────────────────────────────────────────────
router.post('/emi', async (req, res) => {
  try {
    const { principal, annualRate, tenureMonths, feePercent = 2, includeGST = true } = req.body;

    if (!principal || !annualRate || !tenureMonths) {
      return res.status(400).json({ message: 'principal, annualRate, and tenureMonths are required' });
    }
    if (principal <= 0 || annualRate <= 0 || tenureMonths <= 0) {
      return res.status(400).json({ message: 'All values must be positive' });
    }

    const emi         = calcEMI(principal, annualRate, tenureMonths);
    const disbursal   = calcDisbursal(principal, feePercent, includeGST);
    const totalPaid   = emi * tenureMonths;
    const totalInterest = totalPaid - principal;
    const totalOutflow  = totalPaid + (principal - disbursal);
    const schedule    = generateAmortization(principal, annualRate, tenureMonths);

    // SIP comparison: reverse — monthly SIP to accumulate principal at 12% CAGR
    const sipRequired = calcRequiredSIP(principal, 12, tenureMonths);
    const sipCorpus   = calcRequiredSIP(totalOutflow, 12, tenureMonths); // what you'd have if invested same

    res.json({
      emi:            Math.round(emi),
      disbursal:      Math.round(disbursal),
      totalInterest:  Math.round(totalInterest),
      totalOutflow:   Math.round(totalOutflow),
      effectiveRate:  ((totalInterest / principal) * 100).toFixed(2),
      sipRequired:    Math.round(sipRequired),
      amortization:   schedule.map(r => ({
        month:     r.month,
        emi:       Math.round(r.emi),
        principal: Math.round(r.principal),
        interest:  Math.round(r.interest),
        balance:   Math.round(r.balance)
      }))
    });

  } catch (err) {
    console.error('[ADVISOR] EMI error:', err.message);
    res.status(500).json({ message: 'Calculation error' });
  }
});

// ──────────────────────────────────────────────────────────────
//  POST /api/advisor/eligibility
//  Calculate max loan eligibility
// ──────────────────────────────────────────────────────────────
router.post('/eligibility', async (req, res) => {
  try {
    const { monthlyIncome, existingEMIs = 0, annualRate = 10.5, tenureMonths = 60 } = req.body;

    if (!monthlyIncome || monthlyIncome <= 0) {
      return res.status(400).json({ message: 'monthlyIncome is required' });
    }

    const maxEMI = (monthlyIncome * 0.50) - existingEMIs;
    const foir   = calcFOIR(existingEMIs, monthlyIncome);

    if (maxEMI <= 0) {
      return res.json({
        eligible: false,
        message: 'FOIR already at or above 50%. No new loan recommended.',
        currentFOIR: foir.toFixed(1),
        maxEligibleLoan: 0
      });
    }

    const r = annualRate / 12 / 100;
    const n = tenureMonths;
    const maxLoan = maxEMI * (Math.pow(1+r, n) - 1) / (r * Math.pow(1+r, n));

    res.json({
      eligible:        true,
      currentFOIR:     foir.toFixed(1),
      maxEMIHeadroom:  Math.round(maxEMI),
      maxEligibleLoan: Math.round(maxLoan),
      basis:           `50% FOIR ceiling | ${annualRate}% rate | ${tenureMonths} months`
    });

  } catch (err) {
    res.status(500).json({ message: 'Eligibility calculation error' });
  }
});

// ──────────────────────────────────────────────────────────────
//  POST /api/advisor/goal
//  Inflation-adjusted goal planning
// ──────────────────────────────────────────────────────────────
router.post('/goal', async (req, res) => {
  try {
    const { name, presentCost, years, inflationRate = 0.06, sipCAGR = 12 } = req.body;

    if (!presentCost || !years) {
      return res.status(400).json({ message: 'presentCost and years are required' });
    }

    const futureCost  = calcInflationFV(presentCost, years, inflationRate);
    const monthlySIP  = calcRequiredSIP(futureCost, sipCAGR, years * 12);
    const inflationImpact = futureCost - presentCost;

    res.json({
      name:             name || 'Goal',
      presentCost:      Math.round(presentCost),
      futureCost:       Math.round(futureCost),
      inflationImpact:  Math.round(inflationImpact),
      inflationPct:     ((inflationImpact / presentCost) * 100).toFixed(1),
      monthlySIPNeeded: Math.round(monthlySIP),
      basis:            `${(inflationRate * 100).toFixed(1)}% inflation | ${sipCAGR}% CAGR SIP`
    });

  } catch (err) {
    res.status(500).json({ message: 'Goal calculation error' });
  }
});

// ──────────────────────────────────────────────────────────────
//  POST /api/advisor/stress
//  Stress test — job loss simulation
// ──────────────────────────────────────────────────────────────
router.post('/stress', async (req, res) => {
  try {
    const { income, rent = 0, existingEMIs = 0, newEMI = 0, savings = 0, jobLossMonths = 3 } = req.body;

    if (!income) return res.status(400).json({ message: 'income is required' });

    const totalFixed      = rent + existingEMIs + newEMI;
    const foir            = calcFOIR(existingEMIs + newEMI, income);
    const monthsToDefault = totalFixed > 0 ? Math.floor(savings / totalFixed) : 999;
    const safeEMI         = Math.max(0, (income * 0.40) - existingEMIs);
    const maxEMI          = Math.max(0, (income * 0.50) - existingEMIs);
    const emergencyTarget = totalFixed * 6;

    // Job loss projection
    let balance = savings;
    const projection = Array.from({ length: 12 }, (_, i) => {
      const isJobLoss = i >= 2 && i < 2 + jobLossMonths;
      const effectiveIncome = isJobLoss ? 0 : income;
      balance = Math.max(0, balance + effectiveIncome - totalFixed);
      return {
        month: i + 1,
        income: effectiveIncome,
        foir: effectiveIncome > 0 ? Math.round(calcFOIR(totalFixed, effectiveIncome)) : 100,
        savingsBalance: Math.round(balance),
        jobLoss: isJobLoss
      };
    });

    res.json({
      currentFOIR:      foir.toFixed(1),
      foirStatus:       foir > 50 ? 'danger' : foir > 40 ? 'caution' : 'safe',
      monthsToDefault,
      safeEMICeiling:   Math.round(safeEMI),
      maxEMI:           Math.round(maxEMI),
      emergencyTarget:  Math.round(emergencyTarget),
      currentSavings:   savings,
      projection
    });

  } catch (err) {
    res.status(500).json({ message: 'Stress test calculation error' });
  }
});

// ──────────────────────────────────────────────────────────────
//  POST /api/advisor/save-loan  (Protected)
//  Save computed loan to user profile
// ──────────────────────────────────────────────────────────────
router.post('/save-loan', protect, async (req, res) => {
  try {
    const { principalAmount, annualRate, tenureMonths, processingFee, loanType } = req.body;

    const emi          = calcEMI(principalAmount, annualRate, tenureMonths);
    const disbursal    = calcDisbursal(principalAmount, processingFee || 2, true);
    const totalInterest = (emi * tenureMonths) - principalAmount;

    const loanEntry = {
      principalAmount, annualRate, tenureMonths, processingFee,
      loanType: loanType || 'personal',
      emi: Math.round(emi),
      disbursal: Math.round(disbursal),
      totalInterest: Math.round(totalInterest)
    };

    await User.findByIdAndUpdate(
      req.user._id,
      { $push: { 'financialProfile.loans': loanEntry } }
    );

    res.json({ message: 'Loan saved to profile', loan: loanEntry });
  } catch (err) {
    res.status(500).json({ message: 'Failed to save loan' });
  }
});

// ──────────────────────────────────────────────────────────────
//  POST /api/advisor/save-goal  (Protected)
// ──────────────────────────────────────────────────────────────
router.post('/save-goal', protect, async (req, res) => {
  try {
    const { name, presentCost, years } = req.body;
    const futureCost = calcInflationFV(presentCost, years);
    const monthlySIP = calcRequiredSIP(futureCost, 12, years * 12);

    const goal = { name, presentCost, years, futureCost: Math.round(futureCost), monthlySIP: Math.round(monthlySIP) };

    await User.findByIdAndUpdate(
      req.user._id,
      { $push: { 'financialProfile.goals': goal } }
    );

    res.json({ message: 'Goal saved', goal });
  } catch (err) {
    res.status(500).json({ message: 'Failed to save goal' });
  }
});

module.exports = router;