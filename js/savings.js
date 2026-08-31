/**
 * Pocket Friend - Savings Goals Controller
 * Android Mobile App Architecture
 */

let editingGoalId = null;
let depositingGoalId = null;

document.addEventListener('DOMContentLoaded', () => {
  if (!checkAuth(true)) return;

  setupLayout('savings');
  loadSavingsGoals();
  bindGoalEvents();
});

function bindGoalEvents() {
  const goalCloseBtn = document.getElementById('goal-modal-close');
  const goalCancelBtn = document.getElementById('goal-modal-cancel');
  const goalForm = document.getElementById('goal-form');

  const depositCloseBtn = document.getElementById('deposit-modal-close');
  const depositCancelBtn = document.getElementById('deposit-modal-cancel');
  const depositForm = document.getElementById('deposit-form');

  if (goalCloseBtn) goalCloseBtn.onclick = closeGoalModal;
  if (goalCancelBtn) goalCancelBtn.onclick = closeGoalModal;
  if (goalForm) goalForm.addEventListener('submit', handleSaveGoal);

  if (depositCloseBtn) depositCloseBtn.onclick = closeDepositModal;
  if (depositCancelBtn) depositCancelBtn.onclick = closeDepositModal;
  if (depositForm) depositForm.addEventListener('submit', handleSaveDeposit);
}

function loadSavingsGoals() {
  const goals = getGoals();

  let totalSaved = 0;
  let totalTarget = 0;
  let completedCount = 0;

  goals.forEach(g => {
    const saved = Number(g.savedAmount) || 0;
    const target = Number(g.targetAmount) || 0;
    totalSaved += saved;
    totalTarget += target;
    if (saved >= target && target > 0) {
      completedCount++;
    }
  });

  const totalSavedEl = document.getElementById('goals-total-saved');
  const totalTargetEl = document.getElementById('goals-total-target');
  const completedCountEl = document.getElementById('goals-completed-count');

  if (totalSavedEl) totalSavedEl.textContent = formatCurrency(totalSaved);
  if (totalTargetEl) totalTargetEl.textContent = formatCurrency(totalTarget);
  if (completedCountEl) completedCountEl.textContent = `${completedCount} of ${goals.length}`;

  renderGoalsList(goals);
}

function renderGoalsList(goals) {
  const container = document.getElementById('goals-grid');
  const emptyState = document.getElementById('goals-empty-state');
  if (!container) return;

  if (goals.length === 0) {
    container.style.display = 'none';
    if (emptyState) emptyState.style.display = 'block';
    return;
  }

  container.style.display = 'flex';
  if (emptyState) emptyState.style.display = 'none';

  container.innerHTML = goals.map(goal => {
    const target = Number(goal.targetAmount) || 1;
    const saved = Number(goal.savedAmount) || 0;
    const progress = Math.min(100, Math.round((saved / target) * 100));
    const isCompleted = progress >= 100;

    return `
      <div class="card" style="margin-bottom: 0;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
          <div>
            <h3 style="font-size: 15px; font-weight: 800; color: var(--text-main);">${escapeHtml(goal.name)}</h3>
            ${goal.description ? `<p style="font-size: 11.5px; color: var(--text-muted); margin-top: 2px;">${escapeHtml(goal.description)}</p>` : ''}
          </div>
          <span class="badge ${isCompleted ? 'badge-income' : 'badge-category'}">${progress}%</span>
        </div>

        <div class="progress-bar-container" style="margin: 8px 0 10px 0;">
          <div class="progress-bar-fill ${isCompleted ? 'success' : ''}" style="width: ${progress}%;"></div>
        </div>

        <div style="display: flex; justify-content: space-between; font-size: 12.5px; margin-bottom: 12px;">
          <div>
            <span style="color: var(--text-muted); font-size: 11px; display: block;">Saved</span>
            <strong style="color: var(--primary); font-size: 14px;">${formatCurrency(saved)}</strong>
          </div>
          <div style="text-align: right;">
            <span style="color: var(--text-muted); font-size: 11px; display: block;">Target</span>
            <strong style="font-size: 14px;">${formatCurrency(target)}</strong>
          </div>
        </div>

        <div style="display: flex; gap: 8px; border-top: 1px solid var(--border-light); padding-top: 10px;">
          <button class="btn btn-sm btn-success" style="flex: 1;" onclick="openDepositModal('${goal.id}')">
            💰 Add Savings
          </button>
          <button class="btn btn-sm btn-secondary" onclick="openGoalModal('${goal.id}')" title="Edit">
            ✏️
          </button>
          <button class="btn btn-sm btn-danger" onclick="confirmDeleteGoal('${goal.id}', '${escapeHtml(goal.name)}')" title="Delete">
            🗑️
          </button>
        </div>
      </div>
    `;
  }).join('');
}

window.openGoalModal = function(id = null) {
  editingGoalId = id;
  const modal = document.getElementById('goal-modal');
  const title = document.getElementById('goal-modal-title');
  const nameInput = document.getElementById('goal-name');
  const targetInput = document.getElementById('goal-target-amount');
  const savedInput = document.getElementById('goal-saved-amount');
  const dateInput = document.getElementById('goal-target-date');
  const descInput = document.getElementById('goal-desc');

  if (id) {
    const goals = getGoals();
    const goal = goals.find(g => g.id === id);
    if (goal) {
      if (title) title.textContent = 'Edit Savings Goal';
      if (nameInput) nameInput.value = goal.name;
      if (targetInput) targetInput.value = goal.targetAmount;
      if (savedInput) savedInput.value = goal.savedAmount;
      if (dateInput) dateInput.value = goal.targetDate || '';
      if (descInput) descInput.value = goal.description || '';
    }
  } else {
    if (title) title.textContent = 'Create Savings Goal';
    if (nameInput) nameInput.value = '';
    if (targetInput) targetInput.value = '';
    if (savedInput) savedInput.value = '';
    if (dateInput) dateInput.value = '';
    if (descInput) descInput.value = '';
  }

  if (modal) modal.classList.add('active');
};

function closeGoalModal() {
  const modal = document.getElementById('goal-modal');
  if (modal) modal.classList.remove('active');
  editingGoalId = null;
}

function handleSaveGoal(e) {
  e.preventDefault();

  const name = document.getElementById('goal-name').value.trim();
  const targetAmount = parseFloat(document.getElementById('goal-target-amount').value);
  const savedAmount = parseFloat(document.getElementById('goal-saved-amount').value) || 0;
  const targetDate = document.getElementById('goal-target-date').value;
  const description = document.getElementById('goal-desc').value.trim();

  if (!name || !targetAmount || targetAmount <= 0) {
    showToast('Please enter a valid goal name and target amount', 'error');
    return;
  }

  if (editingGoalId) {
    updateGoal({
      id: editingGoalId,
      name,
      targetAmount,
      savedAmount,
      targetDate,
      description
    });
    showToast('Goal updated! ✨', 'success');
  } else {
    saveGoal({
      name,
      targetAmount,
      savedAmount,
      targetDate,
      description
    });
    showToast('New savings goal created! 🎯', 'success');
  }

  closeGoalModal();
  loadSavingsGoals();
}

window.openDepositModal = function(id) {
  depositingGoalId = id;
  const goals = getGoals();
  const goal = goals.find(g => g.id === id);
  if (!goal) return;

  const modal = document.getElementById('deposit-modal');
  const nameDisplay = document.getElementById('deposit-goal-name');
  const amountInput = document.getElementById('deposit-amount');

  if (nameDisplay) nameDisplay.textContent = `🎯 Goal: ${goal.name}`;
  if (amountInput) amountInput.value = '';

  if (modal) modal.classList.add('active');
};

function closeDepositModal() {
  const modal = document.getElementById('deposit-modal');
  if (modal) modal.classList.remove('active');
  depositingGoalId = null;
}

function handleSaveDeposit(e) {
  e.preventDefault();

  const amountInput = document.getElementById('deposit-amount');
  const amount = parseFloat(amountInput.value);

  if (!amount || amount <= 0) {
    showToast('Please enter a valid amount', 'error');
    return;
  }

  const updated = addGoalSavings(depositingGoalId, amount);
  if (updated) {
    showToast(`+${formatCurrency(amount)} added to ${updated.name}! 🚀`, 'success');
    closeDepositModal();
    loadSavingsGoals();
  }
}

window.confirmDeleteGoal = function(id, name) {
  showConfirmModal(
    'Delete Goal',
    `Are you sure you want to delete the goal <strong>"${escapeHtml(name)}"</strong>?`,
    () => {
      deleteGoal(id);
      showToast('Goal deleted', 'info');
      loadSavingsGoals();
    },
    'Delete',
    true
  );
};
