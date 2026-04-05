const SWP = {
  chart: null,

  compute() {
    const corpusEl   = document.getElementById("swp-corpus");
    const withdrawEl = document.getElementById("swp-withdraw");
    const rateEl     = document.getElementById("swp-rate");
    const yearsEl    = document.getElementById("swp-years");
    const inflEl     = document.getElementById("swp-inflation");

    const corpus     = parseFloat(corpusEl?.value);
    const withdraw   = parseFloat(withdrawEl?.value);
    const annualRate = parseFloat(rateEl?.value);
    const years      = parseFloat(yearsEl?.value);
    const inflation  = parseFloat(inflEl?.value) || 0;

    const errorEl = document.getElementById("swp-error");

    // ✅ Clean Validation (no false positives)
    const isInvalid =
      isNaN(corpus) || corpus <= 0 ||
      isNaN(withdraw) || withdraw <= 0 ||
      isNaN(annualRate) || annualRate <= 0 ||
      isNaN(years) || years <= 0;

    if (isInvalid) {
      if (errorEl) errorEl.innerText = "⚠️ Enter valid positive values in all fields";
      return;
    } else {
      if (errorEl) errorEl.innerText = "";
    }

    const months = years * 12;
    const r = annualRate / 100 / 12;

    let balance = corpus;
    let labels = [];
    let corpusData = [];
    let interestData = [];

    let totalWithdrawn = 0;
    let totalInterest = 0;

    let depleted = false;
    let depletionYear = null;

    let currentWithdraw = withdraw;

    for (let i = 1; i <= months; i++) {

      // 📈 Inflation-adjusted withdrawal (yearly)
      if (i % 12 === 1 && i > 1) {
        currentWithdraw *= (1 + inflation / 100);
      }

      const interest = balance * r;
      totalInterest += interest;

      balance = balance + interest - currentWithdraw;
      totalWithdrawn += currentWithdraw;

      if (balance <= 0 && !depleted) {
        depleted = true;
        depletionYear = Math.ceil(i / 12);
        balance = 0;
      }

      if (i % 12 === 0) {
        labels.push("Yr " + (i / 12));
        corpusData.push(+balance.toFixed(2));
        interestData.push(+interest.toFixed(2));
      }
    }

    // 🧠 Safe Withdrawal Rate
    const swr = (withdraw * 12 / corpus) * 100;
    const swrMsg =
      swr <= 4 ? "🟢 Very Safe" :
      swr <= 6 ? "🟡 Moderate" :
      "🔴 Risky";

    // 🔁 How long corpus lasts
    let tempBal = corpus;
    let m = 0;
    while (tempBal > 0 && m < 1200) {
      tempBal = tempBal * (1 + r) - withdraw;
      m++;
    }
    const yearsLasted = (m / 12).toFixed(1);

    // 🧠 Smart Advice
    let advice = "";
    if (depleted && depletionYear < years) {
      advice = "❌ You are withdrawing too fast. Reduce withdrawal or increase corpus.";
    } else if (swr > 6) {
      advice = "⚠️ High withdrawal rate. Risk of early depletion.";
    } else {
      advice = "✅ Strategy looks sustainable.";
    }

    // ❤️ Health Indicator
    let health = "✅ Corpus Safe";
    if (depleted) health = `❌ Depleted by Year ${depletionYear}`;
    else if (balance < corpus * 0.25) health = "⚠️ Running Low";

    // 🖥️ Safe DOM setter
    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.innerText = val;
    };

    // 📤 Outputs
    set("swp-withdrawn", "₹" + fmt(totalWithdrawn));
    set("swp-balance", "₹" + fmt(balance));
    set("swp-depletion", depleted ? `Year ${depletionYear}` : `Survives ${years} yrs ✅`);
    set("swp-health", health);
    set("swp-swr", `${swr.toFixed(2)}% (${swrMsg})`);
    set("swp-interest", "₹" + fmt(totalInterest));
    set("swp-lasting", `${yearsLasted} years`);
    set("swp-advice", advice);

    // 📊 Chart Rendering
    if (this.chart) this.chart.destroy();

    const ctx = document.getElementById("swp-chart");
    if (!ctx) return;

    this.chart = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Remaining Corpus",
            data: corpusData,
            borderColor: "#22c55e",
            backgroundColor: "rgba(34,197,94,0.1)",
            fill: true,
            tension: 0.4,
            pointRadius: 2
          },
          {
            label: "Interest Earned",
            data: interestData,
            borderColor: "#d4af37",
            backgroundColor: "rgba(212,175,55,0.1)",
            fill: true,
            tension: 0.4,
            pointRadius: 2
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: "bottom" }
        },
        scales: {
          y: {
            min: 0,
            ticks: {
              callback: v =>
                "₹" + (v >= 1e7
                  ? (v / 1e7).toFixed(1) + "Cr"
                  : v >= 1e5
                  ? (v / 1e5).toFixed(1) + "L"
                  : v)
            }
          }
        }
      }
    });
  }
};


// 💰 Formatter
function fmt(n) {
  if (n >= 1e7) return (n / 1e7).toFixed(2) + " Cr";
  if (n >= 1e5) return (n / 1e5).toFixed(2) + " L";
  return Math.round(n).toLocaleString("en-IN");
}