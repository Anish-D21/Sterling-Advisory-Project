/**
 * calculator.js — Sterling Advisory Financial Engine
 *
 * All calculations use INR (₹), Indian financial standards:
 * ─ Reducing Balance EMI (standard bank method)
 * ─ Processing Fee + 18% GST deducted from disbursal
 * ─ FOIR based on gross monthly income
 * ─ SIP comparison at 12% CAGR (equity benchmark)
 * ─ Amortization schedule (month-by-month)
 */

// ══════════════════════════════════════════════════════════════════
//  FORMATTING UTILITIES
// ══════════════════════════════════════════════════════════════════

/**
 * Format a number as Indian Rupee (en-IN locale)
 * e.g. 1234567 → ₹12,34,567
 */
function formatINR(amount, decimals = 0) {
  if (isNaN(amount) || amount === null) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals
  }).format(amount);
}

/**
 * Format percentage
 */
function formatPct(val, dec = 1) {
  if (isNaN(val) || val === null) return '—';
  return val.toFixed(dec) + '%';
}

// ══════════════════════════════════════════════════════════════════
//  CORE FINANCIAL FORMULAS
// ══════════════════════════════════════════════════════════════════

/**
 * EMI using Reducing Balance Method (standard Indian bank formula)
 * Formula: EMI = P × r(1+r)ⁿ / ((1+r)ⁿ - 1)
 *
 * @param {number} principal   - Loan amount in ₹
 * @param {number} annualRate  - Annual interest rate (e.g. 10.5 for 10.5%)
 * @param {number} tenureMonths- Loan tenure in months
 * @returns {number} Monthly EMI in ₹
 */
function calcEMI(principal, annualRate, tenureMonths) {
  if (!principal || !annualRate || !tenureMonths) return 0;
  const r = annualRate / 12 / 100;        // Monthly interest rate
  const n = tenureMonths;
  if (r === 0) return principal / n;       // Edge case: 0% interest
  const emi = principal * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
  return emi;
}

/**
 * Actual Loan Disbursal after deducting Processing Fee + GST
 * Processing Fee is typically 1–3% of principal
 * GST on Financial Services = 18%
 *
 * @param {number} principal     - Loan amount requested
 * @param {number} feePercent    - Processing fee % (e.g. 2 for 2%)
 * @param {boolean} includeGST   - Whether to apply 18% GST on the fee
 * @returns {number} Amount actually credited to bank account
 */
function calcDisbursal(principal, feePercent, includeGST = true) {
  const fee    = (feePercent / 100) * principal;
  const gst    = includeGST ? fee * 0.18 : 0;
  const deduct = fee + gst;
  return principal - deduct;
}

/**
 * Calculate total interest paid over loan life
 * @param {number} emi          - Monthly EMI
 * @param {number} tenureMonths - Total months
 * @param {number} principal    - Original principal
 * @returns {number} Total interest paid
 */
function calcTotalInterest(emi, tenureMonths, principal) {
  return (emi * tenureMonths) - principal;
}

/**
 * FOIR — Fixed Obligation to Income Ratio
 * Indian banking ceiling: 50% (RBI/CRISIL guideline)
 * @param {number} totalEMIs    - Sum of all monthly EMI obligations
 * @param {number} monthlyIncome- Gross monthly in-hand income
 * @returns {number} FOIR as percentage (0–100)
 */
function calcFOIR(totalEMIs, monthlyIncome) {
  if (!monthlyIncome || monthlyIncome <= 0) return 0;
  return (totalEMIs / monthlyIncome) * 100;
}

/**
 * Maximum Loan Eligibility based on 50% FOIR
 * Bank will lend so that (existing EMIs + new EMI) ≤ 50% income
 * @param {number} monthlyIncome    - Gross monthly income
 * @param {number} existingEMIs     - Sum of current EMI obligations
 * @param {number} annualRate       - Interest rate for new loan
 * @param {number} tenureMonths     - Desired tenure
 * @returns {number} Maximum eligible loan principal
 */
function calcLoanEligibility(monthlyIncome, existingEMIs, annualRate, tenureMonths = 60) {
  const maxEMI    = (monthlyIncome * 0.50) - existingEMIs; // Headroom at 50%
  if (maxEMI <= 0) return 0;
  const r         = annualRate / 12 / 100;
  const n         = tenureMonths;
  // Reverse EMI formula: P = EMI × ((1+r)ⁿ - 1) / (r × (1+r)ⁿ)
  const principal = maxEMI * (Math.pow(1 + r, n) - 1) / (r * Math.pow(1 + r, n));
  return Math.max(0, principal);
}

/**
 * SIP Corpus — Future Value of a Systematic Investment Plan
 * Used to compare "investing EMI amount" vs "taking a loan"
 * Formula: FV = PMT × ((1+r)ⁿ - 1) / r × (1+r)   [annuity due]
 *
 * @param {number} monthlyAmount - Monthly SIP amount
 * @param {number} annualCAGR    - Expected annual return (e.g. 12 for 12%)
 * @param {number} months        - Investment duration in months
 * @returns {number} Future corpus value
 */
function calcSIPCorpus(monthlyAmount, annualCAGR, months) {
  const r  = annualCAGR / 12 / 100;
  const fv = monthlyAmount * ((Math.pow(1 + r, months) - 1) / r) * (1 + r);
  return fv;
}

/**
 * Reverse SIP — How much monthly SIP needed to reach a target corpus?
 * @param {number} targetAmount - Target corpus
 * @param {number} annualCAGR   - Expected CAGR %
 * @param {number} months       - Investment duration
 * @returns {number} Required monthly SIP amount
 */
function calcRequiredSIP(targetAmount, annualCAGR, months) {
  const r = annualCAGR / 12 / 100;
  const sip = targetAmount * r / ((Math.pow(1 + r, months) - 1) * (1 + r));
  return Math.max(0, sip);
}

/**
 * Inflation-Adjusted Future Cost
 * Formula: FV = PV × (1 + inflation_rate)^years
 * India RBI benchmark: 6% annual inflation
 *
 * @param {number} presentCost   - Today's cost in ₹
 * @param {number} years         - Years to future date
 * @param {number} inflationRate - Annual inflation (default 6%)
 * @returns {number} Future cost in ₹
 */
function calcInflationFV(presentCost, years, inflationRate = 0.06) {
  return presentCost * Math.pow(1 + inflationRate, years);
}

/**
 * Emergency Fund Target (6 months of fixed obligations)
 * @param {number} rent        - Monthly rent
 * @param {number} existingEMI - Existing monthly EMIs
 * @param {number} newEMI      - New EMI being considered
 * @param {number} months      - Target months (6 = conservative, 9-12 = recommended)
 * @returns {number} Target emergency fund
 */
function calcEmergencyFund(rent, existingEMI, newEMI, months = 6) {
  return (rent + existingEMI + newEMI) * months;
}

/**
 * Generate full amortization schedule (reducing balance)
 * @param {number} principal    - Loan principal
 * @param {number} annualRate   - Annual interest rate %
 * @param {number} months       - Tenure in months
 * @returns {Array} Array of {month, emi, principal, interest, balance}
 */
function generateAmortization(principal, annualRate, months) {
  const r   = annualRate / 12 / 100;
  const emi = calcEMI(principal, annualRate, months);
  const schedule = [];
  let balance = principal;

  for (let m = 1; m <= months; m++) {
    const interestComponent  = balance * r;
    const principalComponent = emi - interestComponent;
    balance = Math.max(0, balance - principalComponent);

    schedule.push({
      month:     m,
      emi:       emi,
      principal: principalComponent,
      interest:  interestComponent,
      balance:   balance
    });
  }
  return schedule;
}

/**
 * 50/30/20 Budget Analysis
 * Needs: Rent + Utilities + Existing EMIs + New EMI
 * Wants: Discretionary spend
 * Savings: Investments + Emergency savings
 *
 * @param {number} income       - Monthly in-hand income
 * @param {number} needs        - Rent + existing EMIs + new EMI
 * @param {number} wants        - Discretionary
 * @param {number} savings      - Savings/investments
 * @returns {Object} { needsPct, wantsPct, savingsPct, lifestyleAlert }
 */
function analyze503020(income, needs, wants, savings) {
  if (!income || income <= 0) return null;
  const needsPct   = (needs   / income) * 100;
  const wantsPct   = (wants   / income) * 100;
  const savingsPct = (savings / income) * 100;

  return {
    needsPct,
    wantsPct,
    savingsPct,
    lifestyleAlert: needsPct > 60,        // Critical alert
    needsWarn:      needsPct > 50,        // Soft warning
    savingsWarn:    savingsPct < 10,      // Under-saving
    unaccounted:    Math.max(0, 100 - needsPct - wantsPct - savingsPct)
  };
}

/**
 * CIBIL Score Impact Simulator
 * Factors and approximate weights per RBI/TransUnion Cibil model:
 * - Payment history:          35%
 * - Credit utilization:       30%
 * - Age of credit:            15%
 * - Credit mix (secured/un):  10%
 * - New enquiries:            10%
 *
 * @param {Object} params
 * @returns {Object} { projectedScore, riskLevel, delta, insights[] }
 */
function simulateCIBIL({ currentScore, secured, unsecured, enquiries, utilization, missedPayments }) {
  if (!currentScore) return null;

  let delta = 0;
  const insights = [];

  // Hard enquiry impact: each enquiry ≈ -7 points for 2 years
  if (enquiries >= 3) {
    delta -= (enquiries - 2) * 7;
    insights.push({
      type: 'bad',
      icon: '🚨',
      text: `Credit Hunger Alert: ${enquiries} hard enquiries signals financial stress to banks. Impact: approx -${(enquiries - 2) * 7} points.`
    });
  } else if (enquiries === 2) {
    delta -= 5;
    insights.push({ type: 'warn', icon: '⚠️', text: '2 enquiries in 6 months — avoid further applications for 3 months.' });
  } else {
    insights.push({ type: 'good', icon: '✅', text: 'Low enquiry count. Minimal score impact from credit applications.' });
  }

  // Credit utilization: >30% = bad, >50% = very bad
  if (utilization > 50) {
    delta -= 20;
    insights.push({ type: 'bad', icon: '💳', text: `${utilization}% credit utilization is critical. Target: below 30%. Pay down balances urgently.` });
  } else if (utilization > 30) {
    delta -= 8;
    insights.push({ type: 'warn', icon: '💳', text: `${utilization}% utilization is elevated. Reduce to below 30% for score improvement.` });
  } else {
    insights.push({ type: 'good', icon: '💳', text: `${utilization}% utilization is healthy. Keep it below 30% for optimal score.` });
  }

  // Missed payments: most damaging factor
  if (missedPayments > 0) {
    delta -= missedPayments * 30;
    insights.push({ type: 'bad', icon: '❌', text: `${missedPayments} missed payment(s) — this is the #1 score killer. Each miss stays on record for 7 years.` });
  } else {
    insights.push({ type: 'good', icon: '✅', text: 'Perfect payment history. This is your strongest score asset — protect it.' });
  }

  // Credit mix: ideal is 60% secured, 40% unsecured
  const total = (secured || 0) + (unsecured || 0);
  if (total > 0) {
    const unsecuredRatio = (unsecured / total) * 100;
    if (unsecuredRatio > 60) {
      delta -= 10;
      insights.push({ type: 'warn', icon: '⚖️', text: `Credit mix is ${unsecuredRatio.toFixed(0)}% unsecured. Ideal is 60% secured. Add a secured loan or reduce personal loans.` });
    } else {
      insights.push({ type: 'good', icon: '⚖️', text: 'Good credit mix. Balanced secured and unsecured portfolio signals responsible borrowing.' });
    }
  }

  // New loan impact: -5 to -10 for a new enquiry
  delta -= 7; // Impact of applying for this loan
  insights.push({ type: 'warn', icon: '📝', text: 'Taking a new loan will trigger a hard enquiry, dropping score by ~7 points temporarily.' });

  const projectedScore = Math.max(300, Math.min(900, currentScore + delta));
  const riskLevel = projectedScore >= 750 ? 'Excellent' :
                    projectedScore >= 700 ? 'Good' :
                    projectedScore >= 650 ? 'Fair' :
                    projectedScore >= 600 ? 'Poor' : 'Very Poor';

  return { projectedScore, riskLevel, delta, insights };
}

// ══════════════════════════════════════════════════════════════════
//  CALCULATOR MODULE (UI Controller)
// ══════════════════════════════════════════════════════════════════

const Calculator = (() => {
  let tableVisible = false;
  let currentSchedule = [];
  let currentYearPage = 0;

  function compute() {
    const principal = parseFloat(document.getElementById('c-principal').value) || 0;
    const rate      = parseFloat(document.getElementById('c-rate').value) || 0;
    const tenure    = parseInt(document.getElementById('c-tenure').value) || 0;
    const feeP      = parseFloat(document.getElementById('c-fee').value) || 0;
    const includeGST = document.getElementById('c-gst').checked;

    if (!principal || !rate || !tenure) {
      clearResults(); return;
    }

    // Core calculations
    const emi        = calcEMI(principal, rate, tenure);
    const disbursal  = calcDisbursal(principal, feeP, includeGST);
    const interest   = calcTotalInterest(emi, tenure, principal);
    const totalOut   = emi * tenure + (principal - disbursal); // EMIs + upfront cost

    // FOIR impact
    const income      = parseFloat(document.getElementById('p-income').value) || 0;
    const existingEMI = parseFloat(document.getElementById('p-existing-emi').value) || 0;
    const newFOIR     = income > 0 ? calcFOIR(existingEMI + emi, income) : null;

    // Display results
    document.getElementById('r-emi').textContent       = formatINR(emi, 0);
    document.getElementById('r-disbursal').textContent = formatINR(disbursal, 0);
    document.getElementById('r-interest').textContent  = formatINR(interest, 0);
    document.getElementById('r-total').textContent     = formatINR(totalOut, 0);
    document.getElementById('r-foir').textContent      = newFOIR !== null ? formatPct(newFOIR) + getFOIRTag(newFOIR) : '—';

    // SIP comparison
    const sipRequired = calcRequiredSIP(principal, 12, tenure);
    const sipCorpus   = calcSIPCorpus(emi, 12, tenure);
    document.getElementById('sip-loan-cost').textContent = formatINR(totalOut, 0);
    document.getElementById('sip-monthly').textContent   = formatINR(sipRequired, 0);
    document.getElementById('sip-sub').textContent       =
      `Monthly SIP at 12% CAGR — corpus after ${tenure} months: ${formatINR(sipCorpus, 0)}`;

    // Build amortization schedule & chart
    currentSchedule = generateAmortization(principal, rate, tenure);
    currentYearPage = 0; 
    Charts.renderAmortization(currentSchedule);

    // Refresh table if open
    if (tableVisible) renderTable();
  }

  function getFOIRTag(foir) {
    if (foir > 60) return ' 🔴';
    if (foir > 50) return ' 🟠';
    if (foir > 40) return ' 🟡';
    return ' 🟢';
  }

  function clearResults() {
    ['r-emi','r-disbursal','r-interest','r-total','r-foir',
     'sip-loan-cost','sip-monthly'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = '—';
    });
  }

  function toggleTable() {
    tableVisible = !tableVisible;
    const wrapper = document.getElementById('amort-table-wrapper');
    const btn     = document.getElementById('table-toggle-btn');
    if (tableVisible) {
      wrapper.classList.remove('hidden');
      btn.textContent = 'Hide Schedule';
      renderTable();
    } else {
      wrapper.classList.add('hidden');
      btn.textContent = 'Show First Year';
    }
  }

  function renderTable() {
    const tbody = document.getElementById('amort-tbody');
    if (!tbody || !currentSchedule.length) return;

    const rowsPerPage = 12;
    const start = currentYearPage * rowsPerPage;
    const end = start + rowsPerPage;

    const rows = currentSchedule.slice(start, end);

    tbody.innerHTML = rows.map(r => `
      <tr>
        <td>${r.month}</td>
        <td>${formatINR(r.emi, 0)}</td>
        <td>${formatINR(r.principal, 0)}</td>
        <td>${formatINR(r.interest, 0)}</td>
        <td>${formatINR(r.balance, 0)}</td>
      </tr>
    `).join('');

    updateYearControls();
  }

  function nextYear() {
    const maxPage = Math.ceil(currentSchedule.length / 12) - 1;
    if (currentYearPage < maxPage) {
      currentYearPage++;
      renderTable();
    }
  }

  function prevYear() {
    if (currentYearPage > 0) {
      currentYearPage--;
      renderTable();
    }
  }

  function updateYearControls() {
    const info = document.getElementById('year-info');
    if (!info) return;

    const totalYears = Math.ceil(currentSchedule.length / 12);
    info.textContent = `Year ${currentYearPage + 1} of ${totalYears}`;
  }

  return { compute, toggleTable, nextYear, prevYear };
})();

// ══════════════════════════════════════════════════════════════════
//  DASHBOARD MODULE
// ══════════════════════════════════════════════════════════════════

const Dashboard = (() => {

  function init() {
    update();
  }

  function update() {
    const income       = parseFloat(document.getElementById('p-income').value) || 0;
    const rent         = parseFloat(document.getElementById('p-rent').value) || 0;
    const existingEMI  = parseFloat(document.getElementById('p-existing-emi').value) || 0;
    const savings      = parseFloat(document.getElementById('p-savings').value) || 0;
    const wants        = parseFloat(document.getElementById('p-wants').value) || 0;
    const emergency    = parseFloat(document.getElementById('p-emergency').value) || 0;

    if (!income) {
      ['kpi-foir','kpi-budget','kpi-eligibility','kpi-runway'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '—';
      });
      return;
    }

    // FOIR
    const needs = rent + existingEMI;
    const foir  = calcFOIR(needs, income);
    const foirEl = document.getElementById('kpi-foir');
    if (foirEl) {
      foirEl.textContent = formatPct(foir);
      foirEl.style.color = foir > 50 ? 'var(--red-danger)' : foir > 40 ? 'var(--amber-warn)' : 'var(--green-safe)';
    }
    setStatus('kpi-foir-status', foir > 50 ? '🔴 Dangerous' : foir > 40 ? '🟡 Caution' : '🟢 Safe');

    // 50/30/20
    const budget = analyze503020(income, needs, wants, savings);
    if (budget) {
      const score = budget.needsPct <= 50 && budget.savingsPct >= 20 ? 'Balanced' :
                    budget.needsPct > 60 ? 'Stressed' : 'Moderate';
      const budgetEl = document.getElementById('kpi-budget');
      if (budgetEl) {
        budgetEl.textContent = score;
        budgetEl.style.color = score === 'Balanced' ? 'var(--green-safe)' :
                               score === 'Stressed' ? 'var(--red-danger)' : 'var(--amber-warn)';
      }
      setStatus('kpi-budget-status',
        `Needs: ${budget.needsPct.toFixed(0)}% | Savings: ${budget.savingsPct.toFixed(0)}%`);

      // Lifestyle alert
      const alertEl = document.getElementById('lifestyle-alert');
      if (alertEl) alertEl.classList.toggle('hidden', !budget.lifestyleAlert);

      // Budget chart
      Charts.renderBudget(budget, income, needs, wants, savings);
    }

    // Loan eligibility (5-year default, 10.5% rate)
    const eligibility = calcLoanEligibility(income, existingEMI, 10.5, 60);
    const eligEl = document.getElementById('kpi-eligibility');
    if (eligEl) eligEl.textContent = eligibility > 0 ? formatINR(eligibility, 0) : '₹0';
    setStatus('kpi-elig-status', eligibility > 0 ? 'At 10.5%, 5yr tenure' : 'FOIR at limit');

    // Runway
    const monthlyFixed = rent + existingEMI;
    const runway = monthlyFixed > 0 ? Math.floor(emergency / monthlyFixed) : 0;
    const runwayEl = document.getElementById('kpi-runway');
    if (runwayEl) {
      runwayEl.textContent = runway + ' mo';
      runwayEl.style.color = runway < 3 ? 'var(--red-danger)' : runway < 6 ? 'var(--amber-warn)' : 'var(--green-safe)';
    }
    setStatus('kpi-runway-status', runway < 6 ? '⚠️ Target: 6 months' : '✅ Strong buffer');

    // Health badge
    updateHealthBadge(foir, runway, budget);

    // FOIR gauge
    Charts.renderFOIRGauge(foir);
  }

  function updateHealthBadge(foir, runway, budget) {
    const badge = document.getElementById('health-badge');
    const label = document.getElementById('health-label');
    if (!badge || !label) return;
    badge.className = 'health-badge';
    if (foir > 50 || runway < 3) {
      badge.classList.add('danger'); label.textContent = 'At Risk';
    } else if (foir > 40 || runway < 6 || (budget && budget.needsWarn)) {
      badge.classList.add('warning'); label.textContent = 'Caution';
    } else {
      label.textContent = 'Healthy';
    }
  }

  function setStatus(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  return { init, update };
})();

// ══════════════════════════════════════════════════════════════════
//  STRESS TEST MODULE
// ══════════════════════════════════════════════════════════════════

const Stress = (() => {

  function compute() {
    const income     = parseFloat(document.getElementById('p-income').value) || 0;
    const rent       = parseFloat(document.getElementById('p-rent').value) || 0;
    const existingEMI= parseFloat(document.getElementById('p-existing-emi').value) || 0;
    const newEMI     = parseFloat(document.getElementById('s-emi').value) || 0;
    const savings    = parseFloat(document.getElementById('s-savings').value) ||
                       parseFloat(document.getElementById('p-emergency').value) || 0;
    const jobLoss    = document.getElementById('s-jobloss').checked;

    const totalEMI   = existingEMI + newEMI;
    const totalFixed = rent + totalEMI;

    // Safe & max EMI ceilings
    const safeEMI = Math.max(0, (income * 0.40) - existingEMI - rent);
    const maxEMI  = Math.max(0, (income * 0.50) - existingEMI - rent);

    setVal('s-safe-emi', formatINR(safeEMI, 0));
    setVal('s-max-emi',  formatINR(maxEMI, 0));
    setVal('s-buffer',   formatINR(calcEmergencyFund(rent, existingEMI, newEMI, 6), 0));

    // Months to default (zero income)
    const monthsToDefault = totalFixed > 0 ? Math.floor(savings / totalFixed) : 99;
    setVal('s-months-default',
      monthsToDefault >= 99 ? '∞' : monthsToDefault + ' mo');

    // Generate 12-month FOIR heatmap
    renderHeatmap(income, totalFixed, jobLoss, savings);

    // Stress chart
    Charts.renderStressChart(income, totalFixed, savings, jobLoss);
  }

  function renderHeatmap(income, totalFixed, jobLoss, savings) {
    const container = document.getElementById('foir-heatmap');
    if (!container) return;
    container.innerHTML = '';

    const months = ['J','F','M','A','M','J','J','A','S','O','N','D'];
    let balance = savings;

    for (let i = 0; i < 12; i++) {
      const isJobLoss = jobLoss && (i >= 2 && i <= 4); // months 3-5
      const effectiveIncome = isJobLoss ? 0 : income;
      const foir = effectiveIncome > 0 ? calcFOIR(totalFixed, effectiveIncome) : 100;

      // Consume savings in job loss months
      if (isJobLoss) balance -= totalFixed;

      const cls = foir > 75 ? 'critical' : foir > 50 ? 'danger' : foir > 40 ? 'caution' : 'safe';
      const cell = document.createElement('div');
      cell.className = `heatmap-cell ${cls}${isJobLoss ? ' jobloss' : ''}`;
      cell.innerHTML = `
        <div class="month-label">${months[i]}</div>
        <div>${foir >= 100 ? '∞' : foir.toFixed(0)}%</div>
        ${isJobLoss ? '<div style="font-size:8px">₹0</div>' : ''}
      `;
      cell.title = `Month ${i+1}: FOIR ${foir.toFixed(1)}%${isJobLoss ? ' (No income)' : ''}`;
      container.appendChild(cell);
    }
  }

  function setVal(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  return { compute };
})();

// ══════════════════════════════════════════════════════════════════
//  GOAL PLANNER MODULE
// ══════════════════════════════════════════════════════════════════

const Goals = (() => {
  let goals = [];

  function add() {
    const name  = document.getElementById('g-name').value.trim();
    const cost  = parseFloat(document.getElementById('g-cost').value) || 0;
    const years = parseFloat(document.getElementById('g-years').value) || 0;

    if (!name || !cost || !years) {
      alert('Please fill all goal fields'); return;
    }

    const futureCost = calcInflationFV(cost, years);
    const income     = parseFloat(document.getElementById('p-income').value) || 0;
    // SIP needed to accumulate future cost at 12% CAGR
    const monthlySIP = calcRequiredSIP(futureCost, 12, years * 12);

    goals.push({ id: Date.now(), name, cost, years, futureCost, monthlySIP });
    render();
    renderChart();

    // Clear inputs
    document.getElementById('g-name').value  = '';
    document.getElementById('g-cost').value  = '';
    document.getElementById('g-years').value = '';
  }

  function remove(id) {
    goals = goals.filter(g => g.id !== id);
    render();
    renderChart();
  }

  function render() {
    const list = document.getElementById('goals-list');
    if (!list) return;
    if (!goals.length) { list.innerHTML = ''; return; }

    list.innerHTML = goals.map(g => `
      <div class="goal-card glass-card">
        <div class="goal-name">${g.name}</div>
        <div class="goal-stats">
          <div class="goal-stat">
            <div class="goal-stat-label">Today's Cost</div>
            <div class="goal-stat-value">${formatINR(g.cost, 0)}</div>
          </div>
          <div class="goal-stat">
            <div class="goal-stat-label">In ${g.years} Years</div>
            <div class="goal-stat-value">${formatINR(g.futureCost, 0)}</div>
          </div>
          <div class="goal-stat">
            <div class="goal-stat-label">Inflation Premium</div>
            <div class="goal-stat-value" style="color:var(--amber-warn)">
              ${formatINR(g.futureCost - g.cost, 0)}
            </div>
          </div>
          <div class="goal-stat">
            <div class="goal-stat-label">Monthly SIP</div>
            <div class="goal-stat-value" style="color:var(--green-safe)">${formatINR(g.monthlySIP, 0)}</div>
          </div>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <span class="goal-inflation-badge">+${((g.futureCost/g.cost - 1)*100).toFixed(0)}% inflation</span>
          <span class="goal-sip-badge">SIP @ 12%</span>
          <button class="goal-delete" onclick="Goals.remove(${g.id})">✕</button>
        </div>
      </div>
    `).join('');
  }

  function renderChart() {
    const card = document.getElementById('goals-chart-card');
    if (!card) return;
    card.style.display = goals.length ? 'block' : 'none';
    if (goals.length) Charts.renderGoalsChart(goals);
  }

  return { add, remove };
})();

// ══════════════════════════════════════════════════════════════════
//  CIBIL SIMULATOR MODULE
// ══════════════════════════════════════════════════════════════════

const Cibil = (() => {

  function analyze() {
    const score    = parseInt(document.getElementById('cibil-score').value)    || 0;
    const secured  = parseInt(document.getElementById('cibil-secured').value)  || 0;
    const unsecured= parseInt(document.getElementById('cibil-unsecured').value)|| 0;
    const enquiries= parseInt(document.getElementById('cibil-enquiries').value)|| 0;
    const util     = parseFloat(document.getElementById('cibil-util').value)   || 0;
    const missed   = parseInt(document.getElementById('cibil-missed').value)   || 0;

    if (!score) return;

    const result = simulateCIBIL({
      currentScore:    score,
      secured, unsecured, enquiries,
      utilization:     util,
      missedPayments:  missed
    });

    if (!result) return;

    setVal('cibil-current',   score);
    setVal('cibil-projected', result.projectedScore);
    setVal('cibil-risk', result.riskLevel);

    // Color coding
    const projEl = document.getElementById('cibil-projected');
    if (projEl) {
      projEl.style.color = result.projectedScore >= 750 ? 'var(--green-safe)' :
                           result.projectedScore >= 650 ? 'var(--amber-warn)' : 'var(--red-danger)';
    }

    // Insights
    const insightsEl = document.getElementById('cibil-insights');
    if (insightsEl) {
      insightsEl.innerHTML = result.insights.map(i => `
        <div class="insight-item ${i.type}">
          <span>${i.icon}</span>
          <span>${i.text}</span>
        </div>
      `).join('');
    }

    // Charts
    Charts.renderCIBILGauge(result.projectedScore);
    Charts.renderCreditMix(secured, unsecured);
  }

  function setVal(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  return { analyze };
})();