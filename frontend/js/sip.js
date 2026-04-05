// frontend/js/sip.js

const SIP = {
    chart: null,

    calculate: function() {
        const monthly = parseFloat(document.getElementById('sip-amt').value) || 0;
        const rate = parseFloat(document.getElementById('sip-rate').value) / 100 / 12;
        const years = parseInt(document.getElementById('sip-years').value) || 0;
        const stepUpPct = (parseFloat(document.getElementById('sip-stepup').value) || 0) / 100;
        const useInflation = document.getElementById('sip-inflation').checked;
        
        let totalInvested = 0;
        let totalValue = 0;
        let monthlyInvestment = monthly;
        
        const months = years * 12;
        const chartData = { labels: [], invested: [], wealth: [] };

        for (let i = 1; i <= months; i++) {
            // Apply annual step up
            if (i > 1 && i % 12 === 1) {
                monthlyInvestment *= (1 + stepUpPct);
            }

            totalInvested += monthlyInvestment;
            totalValue = (totalValue + monthlyInvestment) * (1 + rate);

            // Record yearly data for the chart
            if (i % 12 === 0 || i === months) {
                let displayValue = totalValue;
                if (useInflation) {
                    displayValue = totalValue / Math.pow(1 + 0.06, i / 12);
                }
                chartData.labels.push(`Yr ${i/12}`);
                chartData.invested.push(Math.round(totalInvested));
                chartData.wealth.push(Math.round(displayValue));
            }
        }

        // Final UI Updates
        document.getElementById('res-sip-invested').innerText = `₹${Math.round(totalInvested).toLocaleString('en-IN')}`;
        document.getElementById('res-sip-gains').innerText = `₹${Math.round(totalValue - totalInvested).toLocaleString('en-IN')}`;
        document.getElementById('res-sip-total').innerText = `₹${Math.round(totalValue).toLocaleString('en-IN')}`;

        this.updateChart(chartData);
    },

    updateChart: function(data) {
        const ctx = document.getElementById('sipChart').getContext('2d');
        if (this.chart) this.chart.destroy();

        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [
                    {
                        label: 'Total Value',
                        data: data.wealth,
                        borderColor: '#d4af37',
                        backgroundColor: 'rgba(212, 175, 55, 0.1)',
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'Invested',
                        data: data.invested,
                        borderColor: '#6b7280',
                        borderDash:[5, 5],
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { ticks: { color: '#9ca3af', font: { size: 10 } }, grid: { color: 'rgba(212,175,55,0.05)' } },
                    x: { ticks: { color: '#9ca3af', font: { size: 10 } }, grid: { display: false } }
                }
            }
        });
    }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => SIP.calculate());