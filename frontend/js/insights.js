/**
 * insights.js — Sterling Advisory UI Controller
 * Navigation, section management, and UX enhancements
 */

// ══════════════════════════════════════════════════════════════════
//  NAVIGATION MODULE
// ══════════════════════════════════════════════════════════════════

const Nav = (() => {
  const titles = {
    dashboard:  ['Dashboard', 'Financial Health Overview'],
    calculator: ['EMI Calculator', 'Reducing Balance Method'],
    stress:     ['Stress Test', 'Simulate Adverse Scenarios'],
    goals:      ['Goal Planner', 'Inflation-Adjusted Planning'],
    cibil:      ['CIBIL Simulator', 'Credit Score Analysis'],
    insights:   ['Knowledge Vault', 'The "Why" Behind Every Metric']
  };

  function show(sectionId, navEl) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(s => {
      s.classList.add('hidden');
      s.classList.remove('active');
    });

    // Show target
    const target = document.getElementById(`section-${sectionId}`);
    if (target) {
      target.classList.remove('hidden');
      target.classList.add('active');
    }

    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    if (navEl) navEl.classList.add('active');

    // Update header
    const [title, sub] = titles[sectionId] || [sectionId, ''];
    const titleEl = document.getElementById('page-title');
    const subEl   = document.getElementById('page-sub');
    if (titleEl) titleEl.textContent = title;
    if (subEl)   subEl.textContent   = sub;

    // Close sidebar on mobile
    if (window.innerWidth < 768) {
      document.getElementById('sidebar').classList.remove('open');
    }

    return false; // prevent default link behavior
  }

  return { show };
})();

// ══════════════════════════════════════════════════════════════════
//  TOOLTIP SYSTEM
// ══════════════════════════════════════════════════════════════════

(function initTooltips() {
  document.addEventListener('click', e => {
    // Close all open tooltips
    document.querySelectorAll('.tooltip-card').forEach(t => t.style.display = '');
  });
})();

// ══════════════════════════════════════════════════════════════════
//  INPUT FORMATTING — Live Comma Formatting for Large Numbers
// ══════════════════════════════════════════════════════════════════

(function initInputHints() {
  document.addEventListener('input', e => {
    if (e.target.classList.contains('sterling-input') && e.target.type === 'number') {
      const val = parseFloat(e.target.value);
      if (!isNaN(val) && val > 0) {
        const hint = formatHint(val);
        let hintEl = e.target.parentElement.querySelector('.input-hint');
        if (!hintEl) {
          hintEl = document.createElement('div');
          hintEl.className = 'input-hint';
          hintEl.style.cssText = `font-size:11px;color:var(--text-muted);margin-top:3px;`;
          e.target.parentElement.appendChild(hintEl);
        }
        hintEl.textContent = hint;
      }
    }
  });

  function formatHint(val) {
    if (val >= 1e7) return `₹${(val/1e7).toFixed(2)} Crore`;
    if (val >= 1e5) return `₹${(val/1e5).toFixed(2)} Lakh`;
    if (val >= 1000) return `₹${(val/1000).toFixed(1)}K`;
    return '';
  }
})();

// ══════════════════════════════════════════════════════════════════
//  KEYBOARD SHORTCUTS
// ══════════════════════════════════════════════════════════════════

document.addEventListener('keydown', e => {
  if (e.altKey) {
    const map = {
      '1': 'dashboard', '2': 'calculator', '3': 'stress',
      '4': 'goals',     '5': 'cibil',      '6': 'insights'
    };
    const section = map[e.key];
    if (section) {
      const navEl = document.querySelector(`[data-section="${section}"]`);
      Nav.show(section, navEl);
    }
  }
  if (e.altKey && e.key === 't') Theme.toggle();
});

// ══════════════════════════════════════════════════════════════════
//  CROSS-MODULE DATA SYNC
// Propagate profile data to other sections automatically
// ══════════════════════════════════════════════════════════════════

(function initDataSync() {
  // Sync income data to Stress Test inputs
  document.addEventListener('input', e => {
    const syncMap = {
      'p-emergency': 's-savings'
    };
    const targetId = syncMap[e.target.id];
    if (targetId) {
      const target = document.getElementById(targetId);
      if (target && !target.value) {
        target.value = e.target.value;
        if (typeof Stress !== 'undefined') Stress.compute();
      }
    }
  });
})();

// ══════════════════════════════════════════════════════════════════
//  ENTRANCE ANIMATIONS
// Staggered card reveal on section change
// ══════════════════════════════════════════════════════════════════

(function initAnimations() {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes cardReveal {
      from { opacity: 0; transform: translateY(16px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .section.active .glass-card {
      animation: cardReveal 0.4s ease forwards;
    }
    .section.active .glass-card:nth-child(1) { animation-delay: 0ms; }
    .section.active .glass-card:nth-child(2) { animation-delay: 60ms; }
    .section.active .glass-card:nth-child(3) { animation-delay: 120ms; }
    .section.active .glass-card:nth-child(4) { animation-delay: 180ms; }
    .section.active .kpi-card:nth-child(1)   { animation-delay: 0ms; }
    .section.active .kpi-card:nth-child(2)   { animation-delay: 50ms; }
    .section.active .kpi-card:nth-child(3)   { animation-delay: 100ms; }
    .section.active .kpi-card:nth-child(4)   { animation-delay: 150ms; }
  `;
  document.head.appendChild(style);
})();

// ══════════════════════════════════════════════════════════════════
//  GOLD PARTICLE EFFECT (Header ambient)
// ══════════════════════════════════════════════════════════════════

(function initAmbient() {
  const header = document.querySelector('.sticky-header');
  if (!header) return;
  // Subtle gold shimmer on header edge
  header.style.background = `
    var(--glass-bg)
  `;
})();

// ══════════════════════════════════════════════════════════════════
//  DEMO DATA PREFILL
// Optional: Fill dashboard with sample data for demo/hackathon
// ══════════════════════════════════════════════════════════════════

function loadDemoData() {
  const fields = {
    'p-income': 85000, 'p-rent': 22000, 'p-existing-emi': 8000,
    'p-savings': 12000, 'p-wants': 18000, 'p-emergency': 150000,
    'c-principal': 500000, 'c-rate': 10.5, 'c-tenure': 60,
    's-emi': 10000, 's-savings': 150000,
    'cibil-score': 740, 'cibil-secured': 1, 'cibil-unsecured': 2,
    'cibil-enquiries': 2, 'cibil-util': 35, 'cibil-missed': 0
  };

  Object.entries(fields).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.value = val;
  });

  if (typeof Dashboard !== 'undefined') Dashboard.update();
  if (typeof Calculator !== 'undefined') Calculator.compute();
  if (typeof Stress !== 'undefined') Stress.compute();
  if (typeof Cibil !== 'undefined') Cibil.analyze();
}

// Expose globally for console access during demo
window.loadDemoData = loadDemoData;
window.Nav = Nav;

// ══════════════════════════════════════════════════════════════════
//  PRINT / EXPORT SUMMARY
// ══════════════════════════════════════════════════════════════════

function exportSummary() {
  const income      = parseFloat(document.getElementById('p-income').value) || 0;
  const existingEMI = parseFloat(document.getElementById('p-existing-emi').value) || 0;
  const newEMI      = parseFloat(document.getElementById('s-emi').value) || 0;
  const foir        = income > 0 ? (((existingEMI + newEMI) / income) * 100).toFixed(1) : 'N/A';

  const summary = `
STERLING ADVISORY — FINANCIAL SUMMARY
======================================
Generated: ${new Date().toLocaleDateString('en-IN')}

PROFILE
Monthly Income:    ₹${income.toLocaleString('en-IN')}
Existing EMIs:     ₹${existingEMI.toLocaleString('en-IN')}
Proposed New EMI:  ₹${newEMI.toLocaleString('en-IN')}
Current FOIR:      ${foir}%

STATUS: ${parseFloat(foir) > 50 ? '⚠️ HIGH RISK — FOIR exceeds 50%' : '✅ WITHIN SAFE LIMITS'}

Generated by Sterling Advisory | Built for Hackathon 2025
  `.trim();

  const blob = new Blob([summary], { type: 'text/plain' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = 'sterling-advisory-summary.txt';
  a.click();
  URL.revokeObjectURL(url);
}

window.exportSummary = exportSummary;

// ══════════════════════════════════════════════════════════════════
//  INSIGHT LINKING SYSTEM (Cross-section navigation)
// ══════════════════════════════════════════════════════════════════

window.goToInsight = function(topic) {
  // Open Insights section using your existing navigation
  const navEl = document.querySelector('[data-section="insights"]');
  Nav.show('insights', navEl);

  // Wait for section to render
  setTimeout(() => {
    const el = document.getElementById(`insight-${topic}`);

    if (el) {
      el.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });

      // Highlight animation (matches your design system)
      el.style.transition = "all 0.3s ease";
      el.style.boxShadow = "0 0 0 2px var(--accent)";
      el.style.transform = "scale(1.02)";

      setTimeout(() => {
        el.style.boxShadow = "";
        el.style.transform = "";
      }, 2000);
    }
  }, 250);
};