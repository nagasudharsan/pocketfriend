/**
 * Pocket Friend - Transactions History Controller
 * Dual Desktop Table & Mobile Card Activity Engine
 */

let currentTransactions = [];
let editingTransactionId = null;
let currentTypeFilter = 'all';

document.addEventListener('DOMContentLoaded', () => {
  if (!checkAuth(true)) return;

  setupLayout('transactions');
  initTransactionsView();
  bindFilterEvents();
});

function initTransactionsView() {
  currentTransactions = getTransactions();
  applyFiltersAndRender();
}

function bindFilterEvents() {
  const searchInput = document.getElementById('tx-search');
  const categoryFilter = document.getElementById('tx-category-filter');
  const sortFilter = document.getElementById('tx-sort-filter');
  const exportBtn = document.getElementById('btn-export-csv');

  if (searchInput) searchInput.addEventListener('input', applyFiltersAndRender);
  if (categoryFilter) categoryFilter.addEventListener('change', applyFiltersAndRender);
  if (sortFilter) sortFilter.addEventListener('change', applyFiltersAndRender);
  if (exportBtn) exportBtn.addEventListener('click', exportTransactionsToCSV);

  // Bind Edit Modal Form
  const editForm = document.getElementById('edit-tx-form');
  if (editForm) {
    editForm.addEventListener('submit', handleSaveEditedTransaction);
  }

  const closeEditModalBtn = document.getElementById('edit-modal-close');
  const cancelEditModalBtn = document.getElementById('edit-modal-cancel');
  if (closeEditModalBtn) closeEditModalBtn.onclick = closeEditModal;
  if (cancelEditModalBtn) cancelEditModalBtn.onclick = closeEditModal;
}

window.selectTypeFilter = function(type) {
  currentTypeFilter = type;
  const pills = document.querySelectorAll('.filter-pill');
  pills.forEach(pill => {
    if (pill.getAttribute('data-type') === type) {
      pill.classList.add('active');
    } else {
      pill.classList.remove('active');
    }
  });
  applyFiltersAndRender();
};

function applyFiltersAndRender() {
  const searchVal = (document.getElementById('tx-search')?.value || '').toLowerCase();
  const categoryVal = document.getElementById('tx-category-filter')?.value || 'all';
  const sortVal = document.getElementById('tx-sort-filter')?.value || 'newest';

  let filtered = [...currentTransactions];

  // Search filter
  if (searchVal) {
    filtered = filtered.filter(t => 
      (t.description && t.description.toLowerCase().includes(searchVal)) ||
      (t.category && t.category.toLowerCase().includes(searchVal)) ||
      (t.paymentMethod && t.paymentMethod.toLowerCase().includes(searchVal)) ||
      (t.amount && t.amount.toString().includes(searchVal))
    );
  }

  // Type filter
  if (currentTypeFilter !== 'all') {
    filtered = filtered.filter(t => t.type === currentTypeFilter);
  }

  // Category filter
  if (categoryVal !== 'all') {
    filtered = filtered.filter(t => t.category.toLowerCase() === categoryVal.toLowerCase());
  }

  // Sort
  filtered.sort((a, b) => {
    if (sortVal === 'newest') {
      return new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt);
    } else if (sortVal === 'oldest') {
      return new Date(a.date || a.createdAt) - new Date(b.date || b.createdAt);
    } else if (sortVal === 'highest') {
      return Number(b.amount) - Number(a.amount);
    } else if (sortVal === 'lowest') {
      return Number(a.amount) - Number(b.amount);
    }
    return 0;
  });

  renderDesktopTable(filtered);
  renderMobileCards(filtered);
  updateMetricsBar(filtered);
}

function updateMetricsBar(list) {
  let income = 0;
  let expense = 0;

  list.forEach(t => {
    const amt = Number(t.amount) || 0;
    if (t.type === 'income') income += amt;
    else if (t.type === 'expense') expense += amt;
  });

  const countEl = document.getElementById('filtered-count');
  const incomeEl = document.getElementById('filtered-income');
  const expenseEl = document.getElementById('filtered-expense');

  if (countEl) countEl.textContent = `${list.length} records`;
  if (incomeEl) incomeEl.textContent = `+${formatCurrency(income)}`;
  if (expenseEl) expenseEl.textContent = `-${formatCurrency(expense)}`;
}

// Render Desktop Table Rows
function renderDesktopTable(list) {
  const tbody = document.getElementById('transactions-table-body');
  const tableContainer = document.getElementById('tx-table-container');
  const emptyState = document.getElementById('tx-empty-state');
  if (!tbody) return;

  if (list.length === 0) {
    if (tableContainer) tableContainer.style.display = 'none';
    if (emptyState) emptyState.style.display = 'block';
    return;
  }

  if (tableContainer) tableContainer.style.display = 'block';
  if (emptyState) emptyState.style.display = 'none';

  tbody.innerHTML = list.map(tx => {
    const isIncome = tx.type === 'income';
    const meta = getCategoryMeta(tx.category);
    const sign = isIncome ? '+' : '-';
    const amountColorClass = isIncome ? 'income' : 'expense';

    return `
      <tr>
        <td style="font-weight: 500;">${formatDate(tx.date)}</td>
        <td>
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 18px;">${meta.icon}</span>
            <strong style="color: var(--text-main);">${escapeHtml(tx.description || tx.category)}</strong>
          </div>
        </td>
        <td><span class="badge badge-category">${escapeHtml(tx.category)}</span></td>
        <td><span class="badge ${isIncome ? 'badge-income' : 'badge-expense'}">${tx.type}</span></td>
        <td><strong class="tx-item-amount ${amountColorClass}">${sign} ${formatCurrency(tx.amount)}</strong></td>
        <td><span style="color: var(--text-muted); font-size: 13px;">${escapeHtml(tx.paymentMethod || 'UPI')}</span></td>
        <td style="text-align: right;">
          <div style="display: inline-flex; gap: 6px;">
            <button class="btn btn-sm btn-secondary" onclick="openEditModal('${tx.id}')" title="Edit">✏️ Edit</button>
            <button class="btn btn-sm btn-danger" onclick="confirmDeleteTransaction('${tx.id}')" title="Delete">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// Render Mobile Card List
function renderMobileCards(list) {
  const container = document.getElementById('transactions-mobile-container');
  const emptyState = document.getElementById('tx-empty-state');
  if (!container) return;

  if (list.length === 0) {
    container.style.display = 'none';
    if (emptyState) emptyState.style.display = 'block';
    return;
  }

  container.style.display = 'flex';
  if (emptyState) emptyState.style.display = 'none';

  container.innerHTML = list.map(tx => {
    const isIncome = tx.type === 'income';
    const meta = getCategoryMeta(tx.category);
    const sign = isIncome ? '+' : '-';
    const amountColorClass = isIncome ? 'income' : 'expense';

    return `
      <div class="tx-item" style="cursor: pointer;" onclick="openEditModal('${tx.id}')">
        <div class="tx-item-left">
          <div class="tx-item-icon ${amountColorClass}">
            ${meta.icon}
          </div>
          <div class="tx-item-info">
            <span class="tx-item-title">${escapeHtml(tx.description || tx.category)}</span>
            <div class="tx-item-meta">
              <span>${escapeHtml(tx.category)}</span>
              <span>•</span>
              <span>${formatDate(tx.date)}</span>
              <span>•</span>
              <span class="badge ${isIncome ? 'badge-income' : 'badge-expense'}" style="font-size: 10px; padding: 2px 6px;">${escapeHtml(tx.paymentMethod || 'UPI')}</span>
            </div>
          </div>
        </div>
        <div class="tx-item-right">
          <div class="tx-item-amount ${amountColorClass}">${sign}${formatCurrency(tx.amount)}</div>
          <span style="font-size: 11px; color: var(--text-muted);">Edit ✏️</span>
        </div>
      </div>
    `;
  }).join('');
}

// Edit Modal Handlers
window.openEditModal = function(id) {
  const tx = currentTransactions.find(t => t.id === id);
  if (!tx) return;

  editingTransactionId = id;

  document.getElementById('edit-tx-id').value = tx.id;
  document.getElementById('edit-tx-type').value = tx.type;
  document.getElementById('edit-tx-amount').value = tx.amount;
  document.getElementById('edit-tx-category').value = tx.category;
  document.getElementById('edit-tx-date').value = tx.date;
  document.getElementById('edit-tx-desc').value = tx.description || '';
  document.getElementById('edit-tx-payment').value = tx.paymentMethod || 'UPI';

  const modal = document.getElementById('edit-tx-modal');
  if (modal) modal.classList.add('active');
};

function closeEditModal() {
  const modal = document.getElementById('edit-tx-modal');
  if (modal) modal.classList.remove('active');
  editingTransactionId = null;
}

function handleSaveEditedTransaction(e) {
  e.preventDefault();

  const id = document.getElementById('edit-tx-id').value;
  const type = document.getElementById('edit-tx-type').value;
  const amount = parseFloat(document.getElementById('edit-tx-amount').value);
  const category = document.getElementById('edit-tx-category').value;
  const date = document.getElementById('edit-tx-date').value;
  const description = document.getElementById('edit-tx-desc').value.trim();
  const paymentMethod = document.getElementById('edit-tx-payment').value;

  if (!amount || amount <= 0) {
    showToast('Please enter a valid amount', 'error');
    return;
  }

  const updated = updateTransaction({
    id,
    type,
    amount,
    category,
    date,
    description: description || category,
    paymentMethod
  });

  if (updated) {
    showToast('Transaction updated successfully! ✨', 'success');
    closeEditModal();
    currentTransactions = getTransactions();
    applyFiltersAndRender();
  } else {
    showToast('Failed to update transaction', 'error');
  }
}

// Delete Handler
window.confirmDeleteTransaction = function(id) {
  const tx = currentTransactions.find(t => t.id === id);
  const title = 'Delete Transaction';
  const message = `Are you sure you want to delete this transaction <strong>"${escapeHtml(tx?.description || 'Transaction')}" (${formatCurrency(tx?.amount)})</strong>? This action cannot be undone.`;

  showConfirmModal(title, message, () => {
    deleteTransaction(id);
    showToast('Transaction deleted', 'info');
    currentTransactions = getTransactions();
    applyFiltersAndRender();
  }, 'Delete', true);
};

// CSV Export Feature
function exportTransactionsToCSV() {
  const transactions = getTransactions();
  if (transactions.length === 0) {
    showToast('No transactions to export', 'error');
    return;
  }

  let csvContent = 'data:text/csv;charset=utf-8,';
  csvContent += 'Date,Description,Category,Type,Amount (INR),Payment Method\n';

  transactions.forEach(t => {
    const desc = `"${(t.description || '').replace(/"/g, '""')}"`;
    const cat = `"${(t.category || '').replace(/"/g, '""')}"`;
    const row = `${t.date},${desc},${cat},${t.type},${t.amount},${t.paymentMethod || 'Cash'}`;
    csvContent += row + '\n';
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `pocket_friend_transactions_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast('Exported CSV file! 📥', 'success');
}
