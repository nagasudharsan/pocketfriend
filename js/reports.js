/**
 * Pocket Friend - Financial Reports & Analytics Controller
 * Pure Vanilla JavaScript & Custom Canvas 2D Graphics Engine
 * Android Mobile App Architecture
 */

let selectedTimeframe = 'this_month';

// Safe Canvas Rounded Rectangle Polyfill
function drawRoundedRect(ctx, x, y, width, height, radius = 6) {
  if (ctx.roundRect) {
    ctx.roundRect(x, y, width, height, radius);
  } else {
    ctx.rect(x, y, width, height);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (!checkAuth(true)) return;

  setupLayout('reports');
  bindReportEvents();
  generateReports();
});

function bindReportEvents() {
  const timeframeSelect = document.getElementById('report-timeframe');
  if (timeframeSelect) {
    timeframeSelect.addEventListener('change', (e) => {
      selectedTimeframe = e.target.value;
      generateReports();
    });
  }

  // Window resize re-draws charts cleanly
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      generateReports();
    }, 200);
  });
}

function filterTransactionsByTimeframe(transactions, timeframe) {
  const now = new Date();

  return transactions.filter(t => {
    if (!t.date) return false;
    const txDate = new Date(t.date);

    if (timeframe === 'this_week') {
      const dayOfWeek = now.getDay() || 7;
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - dayOfWeek + 1);
      startOfWeek.setHours(0, 0, 0, 0);
      return txDate >= startOfWeek;
    } else if (timeframe === 'this_month') {
      const currentYearMonth = now.toISOString().slice(0, 7);
      return t.date.startsWith(currentYearMonth);
    } else if (timeframe === 'last_month') {
      const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const prevYearMonth = prevMonthDate.toISOString().slice(0, 7);
      return t.date.startsWith(prevYearMonth);
    } else if (timeframe === 'this_year') {
      const currentYear = now.getFullYear().toString();
      return t.date.startsWith(currentYear);
    }
    return true;
  });
}

function generateReports() {
  const allTransactions = getTransactions();
  const filteredTx = filterTransactionsByTimeframe(allTransactions, selectedTimeframe);

  let totalIncome = 0;
  let totalExpenses = 0;
  const categoryExpenses = {};

  filteredTx.forEach(t => {
    const amt = Number(t.amount) || 0;
    if (t.type === 'income') {
      totalIncome += amt;
    } else if (t.type === 'expense') {
      totalExpenses += amt;
      const cat = t.category || 'Other';
      categoryExpenses[cat] = (categoryExpenses[cat] || 0) + amt;
    }
  });

  const netSavings = totalIncome - totalExpenses;

  // Calculate Average Daily Spending
  let daysInPeriod = 1;
  const now = new Date();
  if (selectedTimeframe === 'this_week') {
    daysInPeriod = Math.max(1, now.getDay() || 7);
  } else if (selectedTimeframe === 'this_month') {
    daysInPeriod = Math.max(1, now.getDate());
  } else if (selectedTimeframe === 'last_month') {
    daysInPeriod = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
  } else if (selectedTimeframe === 'this_year') {
    const startYear = new Date(now.getFullYear(), 0, 1);
    daysInPeriod = Math.max(1, Math.ceil((now - startYear) / (1000 * 60 * 60 * 24)));
  } else {
    daysInPeriod = 30;
  }

  const avgDailySpending = Math.round(totalExpenses / daysInPeriod);

  // Update Summary Metrics
  const incomeEl = document.getElementById('report-total-income');
  const expensesEl = document.getElementById('report-total-expenses');
  const savingsEl = document.getElementById('report-net-savings');
  const avgDailyEl = document.getElementById('report-avg-daily');

  if (incomeEl) incomeEl.textContent = formatCurrency(totalIncome);
  if (expensesEl) expensesEl.textContent = formatCurrency(totalExpenses);
  if (savingsEl) savingsEl.textContent = formatCurrency(netSavings);
  if (avgDailyEl) avgDailyEl.textContent = formatCurrency(avgDailySpending);

  // Render Category Pie/Donut Chart
  renderCategoryDonutChart(categoryExpenses, totalExpenses);

  // Render Income vs Expense Bar Chart
  renderIncomeExpenseBarChart(totalIncome, totalExpenses);

  // Render Monthly Spending Trend Chart
  renderMonthlyTrendChart(allTransactions);
}

// 1. Category Breakdown Doughnut Chart
function renderCategoryDonutChart(categoryExpenses, totalExpenses) {
  const canvas = document.getElementById('reportCategoryChart');
  const legend = document.getElementById('report-category-legend');
  if (!canvas) return;

  const categories = Object.keys(categoryExpenses);
  if (categories.length === 0 || totalExpenses === 0) {
    const ctx = canvas.getContext('2d');
    canvas.width = 240;
    canvas.height = 180;
    ctx.clearRect(0, 0, 240, 180);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '13px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No spending recorded for this period', 120, 90);
    if (legend) legend.innerHTML = '';
    return;
  }

  const data = categories.map(c => categoryExpenses[c]);
  const colors = categories.map(c => getCategoryMeta(c).color);

  const ctx = canvas.getContext('2d');
  const width = canvas.width = 240;
  const height = canvas.height = 240;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(centerX, centerY) - 14;
  const innerRadius = radius * 0.65;

  ctx.clearRect(0, 0, width, height);

  let startAngle = -Math.PI / 2;

  for (let i = 0; i < data.length; i++) {
    const sliceAngle = (data[i] / totalExpenses) * 2 * Math.PI;
    const endAngle = startAngle + sliceAngle;

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
    ctx.closePath();

    ctx.fillStyle = colors[i];
    ctx.fill();

    startAngle = endAngle;
  }

  // Legend with amounts and percentages
  if (legend) {
    legend.innerHTML = categories.map((cat, i) => {
      const pct = Math.round((categoryExpenses[cat] / totalExpenses) * 100);
      return `
        <div class="legend-item">
          <div class="legend-color" style="background-color: ${colors[i]};"></div>
          <span>${cat}: <strong>${formatCurrency(categoryExpenses[cat])}</strong> (${pct}%)</span>
        </div>
      `;
    }).join('');
  }
}

// 2. Income vs Expenses Comparison Bar Chart
function renderIncomeExpenseBarChart(income, expense) {
  const canvas = document.getElementById('reportIncomeExpenseChart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const width = canvas.width = 280;
  const height = canvas.height = 200;

  ctx.clearRect(0, 0, width, height);

  const maxVal = Math.max(income, expense, 1000);
  const chartHeight = 130;
  const bottomY = 160;

  const barWidth = 48;
  const incomeX = 46;
  const expenseX = 160;

  const incomeHeight = (income / maxVal) * chartHeight;
  const expenseHeight = (expense / maxVal) * chartHeight;

  // Grid line
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(20, bottomY);
  ctx.lineTo(260, bottomY);
  ctx.stroke();

  // Income Bar
  ctx.fillStyle = '#10b981';
  ctx.beginPath();
  drawRoundedRect(ctx, incomeX, bottomY - incomeHeight, barWidth, incomeHeight, 6);
  ctx.fill();

  // Expense Bar
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  drawRoundedRect(ctx, expenseX, bottomY - expenseHeight, barWidth, expenseHeight, 6);
  ctx.fill();

  // Labels & Values
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light' && !document.body.classList.contains('light-mode');
  ctx.fillStyle = isDark ? '#94a3b8' : '#475569';
  ctx.font = '600 12px Inter, sans-serif';
  ctx.textAlign = 'center';

  ctx.fillText('Income', incomeX + barWidth / 2, bottomY + 18);
  ctx.fillText('Spent', expenseX + barWidth / 2, bottomY + 18);

  ctx.fillStyle = isDark ? '#f8fafc' : '#0f172a';
  ctx.font = '700 11px Inter, sans-serif';
  ctx.fillText(formatCurrency(income), incomeX + barWidth / 2, Math.max(16, bottomY - incomeHeight - 6));
  ctx.fillText(formatCurrency(expense), expenseX + barWidth / 2, Math.max(16, bottomY - expenseHeight - 6));
}

// 3. Monthly Spending Trend Chart
function renderMonthlyTrendChart(transactions) {
  const canvas = document.getElementById('reportMonthlyTrendChart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const width = canvas.width = 320;
  const height = canvas.height = 190;

  ctx.clearRect(0, 0, width, height);

  // Group by last 5 months
  const months = [];
  const monthLabels = [];
  const monthExpenseTotals = [];
  const now = new Date();

  for (let i = 4; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toISOString().slice(0, 7);
    const monthShort = d.toLocaleString('default', { month: 'short' });
    months.push(key);
    monthLabels.push(monthShort);

    let monthlySpent = 0;
    transactions.forEach(t => {
      if (t.type === 'expense' && t.date && t.date.startsWith(key)) {
        monthlySpent += Number(t.amount) || 0;
      }
    });
    monthExpenseTotals.push(monthlySpent);
  }

  const maxVal = Math.max(...monthExpenseTotals, 1000);
  const chartHeight = 110;
  const bottomY = 150;
  const startX = 20;
  const slotWidth = (width - 40) / months.length;

  const isDark = document.documentElement.getAttribute('data-theme') !== 'light' && !document.body.classList.contains('light-mode');

  // Baseline
  ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(10, bottomY);
  ctx.lineTo(width - 10, bottomY);
  ctx.stroke();

  // Draw Bars with Gradient
  months.forEach((m, idx) => {
    const amt = monthExpenseTotals[idx];
    const barH = (amt / maxVal) * chartHeight;
    const barW = 28;
    const barX = startX + idx * slotWidth + (slotWidth - barW) / 2;

    const grad = ctx.createLinearGradient(0, bottomY - barH, 0, bottomY);
    grad.addColorStop(0, '#6366f1');
    grad.addColorStop(1, '#8b5cf6');

    ctx.fillStyle = grad;
    ctx.beginPath();
    drawRoundedRect(ctx, barX, bottomY - barH, barW, barH, 6);
    ctx.fill();

    // Month Label
    ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
    ctx.font = '500 11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(monthLabels[idx], barX + barW / 2, bottomY + 16);

    // Value Label
    if (amt > 0) {
      ctx.fillStyle = isDark ? '#f8fafc' : '#0f172a';
      ctx.font = '700 9.5px Inter, sans-serif';
      ctx.fillText(formatCurrency(amt), barX + barW / 2, Math.max(14, bottomY - barH - 4));
    }
  });
}
