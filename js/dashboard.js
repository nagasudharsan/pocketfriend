/**
 * Pocket Friend - Dashboard Controller
 * Pure Vanilla JavaScript & Custom HTML5 Canvas Chart Engine
 * Fully Responsive Desktop + Mobile Architecture
 */

document.addEventListener('DOMContentLoaded', () => {
  if (!checkAuth(true)) return;

  initSplashScreen();
  setupLayout('home');
  loadDashboardData();

  window.addEventListener('storage', () => {
    loadDashboardData();
  });

  // Handle window resize for canvas redraw
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      loadDashboardData();
    }, 200);
  });
});

function loadDashboardData() {
  const transactions = getTransactions();
  const goals = getGoals();
  const budgets = getBudgets();
  const { totalIncome, totalExpenses, balance } = calculateBalance();

  // Update Summary Stats Cards
  const totalBalanceEl = document.getElementById('stat-balance');
  const totalIncomeEl = document.getElementById('stat-income');
  const totalExpensesEl = document.getElementById('stat-expense');
  const budgetUsedEl = document.getElementById('stat-budget-used');

  if (totalBalanceEl) totalBalanceEl.textContent = formatCurrency(balance);
  if (totalIncomeEl) totalIncomeEl.textContent = `+${formatCurrency(totalIncome)}`;
  if (totalExpensesEl) totalExpensesEl.textContent = `-${formatCurrency(totalExpenses)}`;

  if (budgetUsedEl) {
    let totalBudget = 0;
    budgets.forEach(b => totalBudget += Number(b.amount) || 0);
    if (totalBudget > 0) {
      budgetUsedEl.textContent = `${formatCurrency(totalBudget)}`;
    } else {
      budgetUsedEl.textContent = `₹0`;
    }
  }

  // Render Recent Transactions (Top 6)
  renderRecentTransactions(transactions.slice(0, 6));

  // Render Canvas Spending Chart
  renderSpendingChart(transactions);

  // Render Savings Goals Preview
  renderDashboardGoals(goals);
}

function renderRecentTransactions(recentTx) {
  const container = document.getElementById('recent-transactions-list');
  if (!container) return;

  if (recentTx.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">💸</div>
        <div class="empty-title">No transactions yet</div>
        <div class="empty-desc">Start by adding your pocket money or recording your first expense.</div>
        <div style="display: flex; gap: 10px; justify-content: center;">
          <a href="add-transaction.html?type=income" class="btn btn-sm btn-success">+ Add Money</a>
          <a href="add-transaction.html?type=expense" class="btn btn-sm btn-danger">- Record Expense</a>
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = recentTx.map(tx => {
    const isIncome = tx.type === 'income';
    const meta = getCategoryMeta(tx.category);
    const sign = isIncome ? '+' : '-';
    const amountClass = isIncome ? 'income' : 'expense';

    return `
      <a href="transactions.html" class="tx-item">
        <div class="tx-item-left">
          <div class="tx-item-icon ${amountClass}">
            ${meta.icon}
          </div>
          <div class="tx-item-info">
            <span class="tx-item-title">${escapeHtml(tx.description || tx.category)}</span>
            <div class="tx-item-meta">
              <span class="badge badge-category" style="padding: 2px 8px; font-size: 11px;">${escapeHtml(tx.category)}</span>
              <span>•</span>
              <span>${formatDate(tx.date)}</span>
              <span>•</span>
              <span>${escapeHtml(tx.paymentMethod || 'UPI')}</span>
            </div>
          </div>
        </div>
        <div class="tx-item-right">
          <span class="tx-item-amount ${amountClass}">${sign} ${formatCurrency(tx.amount)}</span>
          <span style="font-size: 11px; color: var(--text-muted); text-transform: capitalize; display: block;">${tx.type}</span>
        </div>
      </a>
    `;
  }).join('');
}

function renderSpendingChart(transactions) {
  const canvas = document.getElementById('spendingChart');
  const legendContainer = document.getElementById('chart-legend');
  const emptyChartMsg = document.getElementById('chart-empty-state');
  if (!canvas) return;

  const currentMonth = new Date().toISOString().slice(0, 7);
  const expenses = transactions.filter(t => t.type === 'expense' && t.date && t.date.startsWith(currentMonth));
  
  if (expenses.length === 0) {
    canvas.style.display = 'none';
    if (legendContainer) legendContainer.innerHTML = '';
    if (emptyChartMsg) emptyChartMsg.style.display = 'block';
    return;
  }

  canvas.style.display = 'block';
  if (emptyChartMsg) emptyChartMsg.style.display = 'none';

  // Group expenses by category
  const categoryTotals = {};
  let totalExpenseAmount = 0;

  expenses.forEach(t => {
    const cat = t.category || 'Other';
    const amt = Number(t.amount) || 0;
    categoryTotals[cat] = (categoryTotals[cat] || 0) + amt;
    totalExpenseAmount += amt;
  });

  const categories = Object.keys(categoryTotals);
  const data = categories.map(cat => categoryTotals[cat]);
  const colors = categories.map(cat => getCategoryMeta(cat).color);

  // Draw Custom HTML5 Canvas Doughnut Chart
  drawDonutChart(canvas, data, colors, categories, totalExpenseAmount);

  // Render Legend
  if (legendContainer) {
    legendContainer.innerHTML = categories.map((cat, i) => {
      const percentage = Math.round((categoryTotals[cat] / totalExpenseAmount) * 100);
      return `
        <div class="legend-item">
          <div class="legend-color" style="background-color: ${colors[i]};"></div>
          <span><strong>${cat}</strong>: ${formatCurrency(categoryTotals[cat])} (${percentage}%)</span>
        </div>
      `;
    }).join('');
  }
}

function drawDonutChart(canvas, data, colors, labels, total) {
  const ctx = canvas.getContext('2d');
  const isDesktop = window.innerWidth >= 768;
  const width = canvas.width = isDesktop ? 260 : 220;
  const height = canvas.height = isDesktop ? 260 : 220;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(centerX, centerY) - 16;
  const innerRadius = radius * 0.64;

  ctx.clearRect(0, 0, width, height);

  let startAngle = -Math.PI / 2;

  for (let i = 0; i < data.length; i++) {
    const sliceAngle = (data[i] / total) * 2 * Math.PI;
    const endAngle = startAngle + sliceAngle;

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
    ctx.closePath();

    ctx.fillStyle = colors[i];
    ctx.fill();

    startAngle = endAngle;
  }

  // Center text
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light' && !document.body.classList.contains('light-mode');
  
  ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
  ctx.font = '500 11.5px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Total Spent', centerX, centerY - 12);

  ctx.fillStyle = isDark ? '#f8fafc' : '#0f172a';
  ctx.font = '800 16px Inter, sans-serif';
  ctx.fillText(formatCurrency(total), centerX, centerY + 10);
}

function renderDashboardGoals(goals) {
  const container = document.getElementById('dashboard-goals-list');
  if (!container) return;

  if (goals.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding: 14px 0;">
        <div class="empty-icon" style="font-size: 30px;">🎯</div>
        <div class="empty-title" style="font-size: 14px;">No active savings goals</div>
        <div class="empty-desc" style="font-size: 12px; margin-bottom: 8px;">Create goals to save up for books, tech, or your dreams.</div>
        <a href="savings.html" class="btn btn-sm btn-primary">+ Create Goal</a>
      </div>
    `;
    return;
  }

  container.innerHTML = goals.slice(0, 3).map(goal => {
    const target = Number(goal.targetAmount) || 1;
    const saved = Number(goal.savedAmount) || 0;
    const progress = Math.min(100, Math.round((saved / target) * 100));
    const isCompleted = progress >= 100;

    return `
      <div style="background: var(--bg-surface); border: 1px solid var(--border-card); border-radius: var(--radius-lg); padding: 14px; margin-bottom: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <span style="font-weight: 700; font-size: 14px; color: var(--text-main);">${escapeHtml(goal.name)}</span>
          <span class="badge ${isCompleted ? 'badge-income' : 'badge-category'}">${progress}%</span>
        </div>
        
        <div class="progress-bar-container" style="margin: 6px 0 8px 0;">
          <div class="progress-bar-fill ${isCompleted ? 'success' : ''}" style="width: ${progress}%;"></div>
        </div>

        <div style="display: flex; justify-content: space-between; font-size: 12.5px;">
          <span style="font-weight: 700; color: var(--primary);">${formatCurrency(saved)}</span>
          <span style="color: var(--text-muted);">Target: ${formatCurrency(target)}</span>
        </div>
      </div>
    `;
  }).join('');
}
