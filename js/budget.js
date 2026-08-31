/**
 * Pocket Friend - Monthly Budget Controller
 * Dual Desktop & Mobile Budget Architecture
 */

let editingBudgetId = null;

document.addEventListener('DOMContentLoaded', () => {
  if (!checkAuth(true)) return;

  setupLayout('budget');
  loadBudgets();
  bindBudgetEvents();
});

function bindBudgetEvents() {
  const closeBtn = document.getElementById('budget-modal-close');
  const cancelBtn = document.getElementById('budget-modal-cancel');
  const form = document.getElementById('budget-form');

  if (closeBtn) closeBtn.onclick = closeBudgetModal;
  if (cancelBtn) cancelBtn.onclick = closeBudgetModal;
  if (form) form.addEventListener('submit', handleSaveBudget);
}

function loadBudgets() {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const budgets = getBudgets();
  const monthlyExpenses = getMonthlyExpenses(currentMonth);

  // Set month label
  const monthLabelEl = document.getElementById('budget-month-label');
  if (monthLabelEl) {
    const monthName = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
    monthLabelEl.textContent = `📅 ${monthName}`;
  }

  // Calculate Category-wise spent
  const categorySpent = {};
  let totalSpent = 0;
  monthlyExpenses.forEach(t => {
    const cat = t.category || 'Other';
    const amt = Number(t.amount) || 0;
    categorySpent[cat] = (categorySpent[cat] || 0) + amt;
    totalSpent += amt;
  });

  // Calculate Total Limit
  let totalLimit = 0;
  budgets.forEach(b => {
    totalLimit += Number(b.amount) || 0;
  });

  // Update Monthly Overview Banner
  const spentTotalEl = document.getElementById('budget-spent-total');
  const limitTotalEl = document.getElementById('budget-limit-total');
  const overallBar = document.getElementById('budget-overall-bar');
  const overallStatus = document.getElementById('budget-overall-status');

  if (spentTotalEl) spentTotalEl.textContent = formatCurrency(totalSpent);
  if (limitTotalEl) limitTotalEl.textContent = formatCurrency(totalLimit);

  if (overallBar && overallStatus) {
    const overallPct = totalLimit > 0 ? Math.min(100, Math.round((totalSpent / totalLimit) * 100)) : 0;
    overallBar.style.width = `${overallPct}%`;
    overallStatus.textContent = `${overallPct}% Used`;
    if (totalSpent > totalLimit && totalLimit > 0) {
      overallStatus.textContent = `Exceeded by ${formatCurrency(totalSpent - totalLimit)}`;
      overallStatus.style.background = 'rgba(239, 68, 68, 0.4)';
    }
  }

  renderBudgetsGrid(budgets, categorySpent);
}

function renderBudgetsGrid(budgets, categorySpent) {
  const container = document.getElementById('budget-cards-grid');
  const emptyState = document.getElementById('budget-empty-state');
  if (!container) return;

  if (budgets.length === 0) {
    container.style.display = 'none';
    if (emptyState) emptyState.style.display = 'block';
    return;
  }

  container.style.display = 'grid';
  if (emptyState) emptyState.style.display = 'none';

  container.innerHTML = budgets.map(b => {
    const limit = Number(b.amount) || 1;
    const spent = Number(categorySpent[b.category]) || 0;
    const remaining = Math.max(0, limit - spent);
    const progress = Math.min(100, Math.round((spent / limit) * 100));
    const isExceeded = spent > limit;
    const isWarning = progress >= 80 && !isExceeded;

    const meta = getCategoryMeta(b.category);
    let barColorClass = 'success';
    if (isExceeded) barColorClass = 'danger';
    else if (isWarning) barColorClass = 'warning';

    return `
      <div class="card" style="margin-bottom: 0; padding: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 24px;">${meta.icon}</span>
            <div>
              <h3 style="font-size: 15px; font-weight: 800; color: var(--text-main);">${escapeHtml(b.category)}</h3>
              <span style="font-size: 11.5px; color: var(--text-muted);">Limit: ${formatCurrency(limit)}</span>
            </div>
          </div>
          <span class="badge ${isExceeded ? 'badge-expense' : 'badge-category'}">${progress}%</span>
        </div>

        <div class="progress-bar-container" style="margin: 8px 0 12px 0;">
          <div class="progress-bar-fill ${barColorClass}" style="width: ${progress}%;"></div>
        </div>

        <div style="display: flex; justify-content: space-between; font-size: 12.5px; margin-bottom: 12px;">
          <div>
            <span style="color: var(--text-muted); font-size: 11px; display: block;">Spent</span>
            <strong style="color: ${isExceeded ? 'var(--danger-text)' : 'var(--text-main)'}; font-size: 13.5px;">${formatCurrency(spent)}</strong>
          </div>
          <div style="text-align: right;">
            <span style="color: var(--text-muted); font-size: 11px; display: block;">Remaining</span>
            <strong style="color: ${isExceeded ? 'var(--danger-text)' : 'var(--success)'}; font-size: 13.5px;">${isExceeded ? '- ' + formatCurrency(spent - limit) : formatCurrency(remaining)}</strong>
          </div>
        </div>

        <div style="display: flex; gap: 8px; border-top: 1px solid var(--border-light); padding-top: 10px;">
          <button class="btn btn-sm btn-secondary" style="flex: 1;" onclick="openBudgetModal('${b.id}')">
            ✏️ Edit Limit
          </button>
          <button class="btn btn-sm btn-danger" onclick="confirmDeleteBudget('${b.id}', '${escapeHtml(b.category)}')" title="Delete">
            🗑️
          </button>
        </div>
      </div>
    `;
  }).join('');
}

window.openBudgetModal = function(id = null) {
  editingBudgetId = id;
  const modal = document.getElementById('budget-modal');
  const title = document.getElementById('budget-modal-title');
  const categorySelect = document.getElementById('budget-category');
  const amountInput = document.getElementById('budget-amount');

  if (id) {
    const budgets = getBudgets();
    const budget = budgets.find(b => b.id === id);
    if (budget) {
      if (title) title.textContent = 'Edit Category Budget';
      if (categorySelect) categorySelect.value = budget.category;
      if (amountInput) amountInput.value = budget.amount;
    }
  } else {
    if (title) title.textContent = 'Set Category Budget';
    if (amountInput) amountInput.value = '';
  }

  if (modal) modal.classList.add('active');
};

function closeBudgetModal() {
  const modal = document.getElementById('budget-modal');
  if (modal) modal.classList.remove('active');
  editingBudgetId = null;
}

function handleSaveBudget(e) {
  e.preventDefault();

  const category = document.getElementById('budget-category').value;
  const amount = parseFloat(document.getElementById('budget-amount').value);

  if (!amount || amount <= 0) {
    showToast('Please enter a valid budget amount', 'error');
    return;
  }

  if (editingBudgetId) {
    updateBudget({
      id: editingBudgetId,
      category,
      amount
    });
    showToast('Budget updated successfully! ✨', 'success');
  } else {
    saveBudget({
      category,
      amount
    });
    showToast('New category budget created! 📊', 'success');
  }

  closeBudgetModal();
  loadBudgets();
}

window.confirmDeleteBudget = function(id, category) {
  showConfirmModal(
    'Delete Budget',
    `Are you sure you want to remove the monthly limit for <strong>"${escapeHtml(category)}"</strong>?`,
    () => {
      deleteBudget(id);
      showToast('Budget limit removed', 'info');
      loadBudgets();
    },
    'Delete',
    true
  );
};
