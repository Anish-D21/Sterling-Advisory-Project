/**
 * charts.js — Sterling Advisory Visualization Module
 * All charts use Chart.js 4.x with theme-aware colors
 */

const Charts = (() => {
  // Active chart instances (for destruction on re-render)
  const instances = {};

  // ── Theme-aware color helpers ──────────────────────────────────
  function getTextColor() {
    return getComputedStyle(document.documentElement)
      .getPropertyValue('--text').trim() || '#064e3b';
  }
  function getMutedColor() {
    return getComputedStyle(document.documentElement)
      .getPropertyValue('--text-muted').trim() || '#6b7280';
  }
  function getAccentColor() { return '#d4af37'; }
  function getBgColor() {
    return getComputedStyle(document.documentElement)
      .getPropertyValue('--glass-bg').trim();
  }

  function destroy(key) {
    if (instances[key]) {
      instances[key].destroy();
      delete instances[key];
    }
  }

  // ── Default chart options (theme-aware) ───────────────────────
  function baseOptions(title = '') {
    return {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          labels: {
            color: getMutedColor(),
            font: { family: 'DM Sans', size: 11 },
            boxWidth: 12, padding: 16
          }
        },
        title: title ? {
          display: true, text: title,
          color: getTextColor(),
          font: { family: 'Playfair Display', size: 14 }
        } : { display: false },
        tooltip: {
          backgroundColor: 'rgba(20,20,20,0.92)',
          titleColor: '#d4af37', bodyColor: '#f8f6f2',
          borderColor: 'rgba(212,175,55,0.2)', borderWidth: 1,
          padding: 12, cornerRadius: 8,
          callbacks: {
            label: ctx => ' ' + ctx.dataset.label + ': ' + ctx.formattedValue
          }
        }
      },
      scales: {
        x: {
          ticks: { color: getMutedColor(), font: { family: 'DM Sans', size: 11 } },
          grid: { color: 'rgba(128,128,128,0.08)' }
        },
        y: {
          ticks: { color: getMutedColor(), font: { family: 'DM Sans', size: 11 } },
          grid: { color: 'rgba(128,128,128,0.08)' }
        }
      }
    };
  }

  // ══════════════════════════════════════════════════════════════
  //  BUDGET DOUGHNUT — 50/30/20
  // ══════════════════════════════════════════════════════════════
  function renderBudget(budget, income, needs, wants, savings) {
    destroy('budget');
    const canvas = document.getElementById('budget-chart');
    if (!canvas) return;

    const unaccounted = Math.max(0, income - needs - wants - savings);

    instances['budget'] = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: ['Needs (Rent+EMIs)', 'Wants', 'Savings', 'Untracked'],
        datasets: [{
          data: [needs, wants, savings, unaccounted],
          backgroundColor: [
            budget.needsWarn ? 'rgba(239,68,68,0.7)' : 'rgba(212,175,55,0.7)',
            'rgba(99,102,241,0.7)',
            'rgba(16,185,129,0.7)',
            'rgba(156,163,175,0.3)'
          ],
          borderColor: [
            budget.needsWarn ? '#ef4444' : '#d4af37',
            '#6366f1', '#10b981', '#9ca3af'
          ],
          borderWidth: 1.5,
          hoverOffset: 8
        }]
      },
      options: {
        responsive: true,
        cutout: '68%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: getMutedColor(), font: { family: 'DM Sans', size: 11 },
              boxWidth: 10, padding: 12
            }
          },
          tooltip: {
            backgroundColor: 'rgba(20,20,20,0.92)',
            titleColor: '#d4af37', bodyColor: '#f8f6f2',
            callbacks: {
              label: ctx => {
                const pct = income > 0 ? ((ctx.parsed / income) * 100).toFixed(1) : 0;
                return ` ${ctx.label}: ₹${Math.round(ctx.parsed).toLocaleString('en-IN')} (${pct}%)`;
              }
            }
          }
        }
      }
    });
  }

  // ══════════════════════════════════════════════════════════════
  //  FOIR GAUGE (Half-doughnut)
  // ══════════════════════════════════════════════════════════════
  function renderFOIRGauge(foirVal) {
    destroy('foir');
    const canvas = document.getElementById('foir-chart');
    if (!canvas) return;

    const foir    = Math.min(100, foirVal);
    const remain  = 100 - foir;
    const color   = foir > 50 ? '#ef4444' : foir > 40 ? '#f59e0b' : '#10b981';

    instances['foir'] = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: ['FOIR', 'Remaining'],
        datasets: [{
          data: [foir, remain],
          backgroundColor: [color, 'rgba(128,128,128,0.1)'],
          borderColor: [color, 'transparent'],
          borderWidth: 2, hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        rotation: -90, circumference: 180,
        cutout: '72%',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => ctx.label === 'FOIR' ? ` FOIR: ${foir.toFixed(1)}%` : ` Available: ${remain.toFixed(1)}%`
            }
          }
        }
      },
      plugins: [{
        id: 'foirLabel',
        afterDraw(chart) {
          const { ctx, chartArea: { top, bottom, left, right } } = chart;
          const x = (left + right) / 2;
          const y = bottom - 20;
          ctx.save();
          ctx.textAlign = 'center';
          ctx.fillStyle = color;
          ctx.font = `bold 26px 'Playfair Display', serif`;
          ctx.fillText(`${foir.toFixed(1)}%`, x, y);
          ctx.fillStyle = getMutedColor();
          ctx.font = `11px 'DM Sans', sans-serif`;
          ctx.fillText('FOIR', x, y + 18);
          ctx.restore();
        }
      }]
    });
  }

  // ══════════════════════════════════════════════════════════════
  //  AMORTIZATION CHART (Stacked Bar)
  // ══════════════════════════════════════════════════════════════
  function renderAmortization(schedule) {
    destroy('amort');
    const canvas = document.getElementById('amort-chart');
    if (!canvas || !schedule.length) return;

    // Group by quarters for cleaner display
    const step     = Math.max(1, Math.floor(schedule.length / 20));
    const labels   = [];
    const principals = [];
    const interests  = [];

    for (let i = 0; i < schedule.length; i += step) {
      const r = schedule[i];
      labels.push(`M${r.month}`);
      principals.push(Math.round(r.principal));
      interests.push(Math.round(r.interest));
    }

    instances['amort'] = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Principal',
            data: principals,
            backgroundColor: 'rgba(16,185,129,0.6)',
            borderColor: '#10b981', borderWidth: 1, stack: 'stack0'
          },
          {
            label: 'Interest',
            data: interests,
            backgroundColor: 'rgba(239,68,68,0.5)',
            borderColor: '#ef4444', borderWidth: 1, stack: 'stack0'
          }
        ]
      },
      options: {
        ...baseOptions(),
        plugins: {
          ...baseOptions().plugins,
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.dataset.label}: ₹${ctx.parsed.y.toLocaleString('en-IN')}`
            }
          }
        },
        scales: {
          x: {
            stacked: true,
            ticks: { color: getMutedColor(), font: { size: 10 } },
            grid: { color: 'rgba(128,128,128,0.06)' }
          },
          y: {
            stacked: true,
            ticks: {
              color: getMutedColor(), font: { size: 10 },
              callback: v => '₹' + (v/1000).toFixed(0) + 'k'
            },
            grid: { color: 'rgba(128,128,128,0.06)' }
          }
        }
      }
    });
  }

  // ══════════════════════════════════════════════════════════════
  //  STRESS TEST LINE CHART
  // ══════════════════════════════════════════════════════════════
  function renderStressChart(income, totalFixed, savings, jobLoss) {
    destroy('stress');
    const canvas = document.getElementById('stress-chart');
    if (!canvas) return;

    const months  = Array.from({length: 12}, (_, i) => `Month ${i+1}`);
    const incomes = months.map((_, i) => jobLoss && i >= 2 && i <= 4 ? 0 : income);
    const foirArr = incomes.map(inc => inc > 0 ? Math.min(100, (totalFixed / inc) * 100) : 100);

    // Savings runway
    let bal = savings;
    const savingsArr = months.map((_, i) => {
      const inc = incomes[i];
      bal = Math.max(0, bal + inc - totalFixed);
      return Math.round(bal);
    });

    instances['stress'] = new Chart(canvas, {
      type: 'line',
      data: {
        labels: months,
        datasets: [
          {
            label: 'FOIR %',
            data: foirArr,
            borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.08)',
            borderWidth: 2, fill: true, tension: 0.3, yAxisID: 'y'
          },
          {
            label: 'Savings Balance (₹)',
            data: savingsArr,
            borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.06)',
            borderWidth: 2, fill: true, tension: 0.3, yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            labels: { color: getMutedColor(), font: { family: 'DM Sans', size: 11 } }
          },
          tooltip: {
            backgroundColor: 'rgba(20,20,20,0.92)',
            titleColor: '#d4af37', bodyColor: '#f8f6f2',
            callbacks: {
              label: ctx => {
                if (ctx.dataset.yAxisID === 'y') return ` FOIR: ${ctx.parsed.y.toFixed(1)}%`;
                return ` Savings: ₹${ctx.parsed.y.toLocaleString('en-IN')}`;
              }
            }
          },
          annotation: jobLoss ? {
            annotations: {
              jobLoss: {
                type: 'box',
                xMin: 2, xMax: 4,
                backgroundColor: 'rgba(239,68,68,0.06)',
                borderColor: 'rgba(239,68,68,0.3)',
                borderWidth: 1,
                label: { content: 'Job Loss Period', display: true, color: '#ef4444', font: { size: 10 } }
              }
            }
          } : {}
        },
        scales: {
          x: { ticks: { color: getMutedColor(), font: { size: 10 } }, grid: { color: 'rgba(128,128,128,0.06)' } },
          y: {
            type: 'linear', position: 'left',
            min: 0, max: 110,
            ticks: { color: '#ef4444', font: { size: 10 }, callback: v => v + '%' },
            grid: { color: 'rgba(239,68,68,0.06)' }
          },
          y1: {
            type: 'linear', position: 'right',
            ticks: { color: '#10b981', font: { size: 10 }, callback: v => '₹' + (v/1000).toFixed(0) + 'k' },
            grid: { drawOnChartArea: false }
          }
        }
      }
    });
  }

  // ══════════════════════════════════════════════════════════════
  //  GOALS INFLATION CHART
  // ══════════════════════════════════════════════════════════════
  function renderGoalsChart(goals) {
    destroy('goals');
    const canvas = document.getElementById('goals-chart');
    if (!canvas) return;

    const maxYears = Math.max(...goals.map(g => g.years));
    const yearRange = Array.from({length: maxYears + 1}, (_, i) => `Year ${i}`);

    const datasets = goals.map((g, idx) => {
      const colors = ['#d4af37','#10b981','#6366f1','#f59e0b','#ef4444'];
      const c = colors[idx % colors.length];
      return {
        label: g.name,
        data: yearRange.map((_, yr) => Math.round(calcInflationFV(g.cost, yr))),
        borderColor: c,
        backgroundColor: c + '15',
        borderWidth: 2, fill: true, tension: 0.3,
        pointRadius: 3, pointHoverRadius: 6
      };
    });

    instances['goals'] = new Chart(canvas, {
      type: 'line',
      data: { labels: yearRange, datasets },
      options: {
        ...baseOptions(),
        plugins: {
          ...baseOptions().plugins,
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.dataset.label}: ₹${ctx.parsed.y.toLocaleString('en-IN')}`
            }
          }
        },
        scales: {
          x: { ticks: { color: getMutedColor(), font: { size: 11 } }, grid: { color: 'rgba(128,128,128,0.06)' } },
          y: {
            ticks: { color: getMutedColor(), font: { size: 11 }, callback: v => '₹' + (v >= 1e7 ? (v/1e7).toFixed(1) + 'Cr' : v >= 1e5 ? (v/1e5).toFixed(1) + 'L' : v) },
            grid: { color: 'rgba(128,128,128,0.06)' }
          }
        }
      }
    });
  }

  // ══════════════════════════════════════════════════════════════
  //  CIBIL SCORE GAUGE
  // ══════════════════════════════════════════════════════════════
  function renderCIBILGauge(score) {
    destroy('cibil');
    const canvas = document.getElementById('cibil-gauge');
    if (!canvas) return;

    const pct   = Math.max(0, ((score - 300) / 600) * 100);
    const color = score >= 750 ? '#10b981' : score >= 650 ? '#f59e0b' : '#ef4444';

    instances['cibil'] = new Chart(canvas, {
      type: 'doughnut',
      data: {
        datasets: [{
          data: [pct, 100 - pct],
          backgroundColor: [color, 'rgba(128,128,128,0.1)'],
          borderColor: [color, 'transparent'],
          borderWidth: 2
        }]
      },
      options: {
        rotation: -90, circumference: 180,
        cutout: '72%',
        plugins: { legend: { display: false }, tooltip: { enabled: false } }
      },
      plugins: [{
        id: 'scoreLabel',
        afterDraw(chart) {
          const { ctx, chartArea: { left, right, bottom } } = chart;
          const x = (left + right) / 2, y = bottom - 15;
          ctx.save();
          ctx.textAlign = 'center';
          ctx.fillStyle = color;
          ctx.font = `bold 24px 'Playfair Display', serif`;
          ctx.fillText(score, x, y);
          ctx.fillStyle = getMutedColor();
          ctx.font = `10px 'DM Sans', sans-serif`;
          ctx.fillText('/ 900', x, y + 16);
          ctx.restore();
        }
      }]
    });
  }

  // ══════════════════════════════════════════════════════════════
  //  CREDIT MIX CHART
  // ══════════════════════════════════════════════════════════════
  function renderCreditMix(secured, unsecured) {
    destroy('creditMix');
    const canvas = document.getElementById('cibil-mix-chart');
    if (!canvas) return;

    instances['creditMix'] = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: ['Your Mix', 'Ideal Mix'],
        datasets: [
          {
            label: 'Secured (Home/Auto)',
            data: [secured, 6],
            backgroundColor: 'rgba(16,185,129,0.65)', borderColor: '#10b981', borderWidth: 1
          },
          {
            label: 'Unsecured (Personal/CC)',
            data: [unsecured, 4],
            backgroundColor: 'rgba(239,68,68,0.55)', borderColor: '#ef4444', borderWidth: 1
          }
        ]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        plugins: {
          legend: {
            labels: { color: getMutedColor(), font: { family: 'DM Sans', size: 11 }, boxWidth: 10 }
          },
          tooltip: {
            backgroundColor: 'rgba(20,20,20,0.92)',
            titleColor: '#d4af37', bodyColor: '#f8f6f2'
          }
        },
        scales: {
          x: { stacked: true, ticks: { color: getMutedColor(), font: { size: 10 } }, grid: { color: 'rgba(128,128,128,0.06)' } },
          y: { stacked: true, ticks: { color: getMutedColor(), font: { size: 11 } }, grid: { display: false } }
        }
      }
    });
  }

  // ── Re-render active charts after theme change ─────────────────
  function rerender() {
    // Small delay to let CSS variables update
    setTimeout(() => {
      Object.keys(instances).forEach(key => {
        const chart = instances[key];
        if (chart) chart.update();
      });
    }, 100);
  }

  return {
    renderBudget, renderFOIRGauge, renderAmortization,
    renderStressChart, renderGoalsChart, renderCIBILGauge,
    renderCreditMix, rerender
  };
})();