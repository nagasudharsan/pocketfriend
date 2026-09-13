/**
 * Pocket Friend - Add Money & Add Expense Handlers
 * Connected to Node.js / Express REST API & MySQL Database
 */

document.addEventListener('DOMContentLoaded', () => {
  if (!checkAuth(true)) return;

  const currentPath = window.location.pathname.toLowerCase();
  setupLayout(currentPath.includes('add-money') ? 'add-money' : 'add-expense');

  // Set default date to today for all date inputs
  const today = new Date().toISOString().split('T')[0];
  const dateInputs = document.querySelectorAll('input[type="date"]');
  dateInputs.forEach(input => {
    if (!input.value) input.value = today;
  });

  // Display current live balance on both forms
  const { balance } = calculateBalance();
  const balanceDisplay = document.getElementById('current-balance-display');
  if (balanceDisplay) {
    balanceDisplay.textContent = formatCurrency(balance);
  }

  // --- ADD MONEY FORM ---
  const addMoneyForm = document.getElementById('add-money-form');
  if (addMoneyForm) {
    addMoneyForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const amountInput = document.getElementById('income-amount');
      const sourceInput = document.getElementById('income-source');
      const dateInput = document.getElementById('income-date');
      const noteInput = document.getElementById('income-note');

      const amount = parseFloat(amountInput.value);
      const source = sourceInput.value;
      const date = dateInput.value || today;
      const note = noteInput.value.trim();

      if (!amount || isNaN(amount) || amount <= 0) {
        showToast('Please enter a valid amount greater than 0', 'error');
        amountInput.focus();
        return;
      }

      if (!source) {
        showToast('Please select an income source', 'error');
        sourceInput.focus();
        return;
      }

      const newTx = {
        type: 'income',
        amount: amount,
        category: source,
        description: note || `${source} Income`,
        date: date,
        paymentMethod: 'UPI / Cash'
      };

      const submitBtn = addMoneyForm.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      // Submit to Backend API
      const apiRes = await TransactionsAPI.create(newTx);
      if (apiRes.success) {
        showToast(apiRes.message || `+${formatCurrency(amount)} added in MySQL! 🎉`, 'success');
      } else {
        saveTransaction(newTx);
        showToast(`+${formatCurrency(amount)} added successfully! 🎉`, 'success');
      }

      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 700);
    });
  }

  // --- ADD EXPENSE FORM ---
  const addExpenseForm = document.getElementById('add-expense-form');
  if (addExpenseForm) {
    addExpenseForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const amountInput = document.getElementById('expense-amount');
      const categoryInput = document.getElementById('expense-category');
      const dateInput = document.getElementById('expense-date');
      const descriptionInput = document.getElementById('expense-desc');
      const paymentMethodInput = document.getElementById('expense-payment-method');

      const amount = parseFloat(amountInput.value);
      let category = categoryInput.value;
      const customCatInput = document.getElementById('custom-category-name');
      if (category === 'Other' && customCatInput && customCatInput.value.trim()) {
        category = customCatInput.value.trim();
      }

      const date = dateInput.value || today;
      const description = descriptionInput.value.trim();
      const paymentMethod = paymentMethodInput.value || 'UPI';

      if (!amount || isNaN(amount) || amount <= 0) {
        showToast('Please enter a valid expense amount greater than 0', 'error');
        amountInput.focus();
        return;
      }

      if (!category) {
        showToast('Please select an expense category', 'error');
        categoryInput.focus();
        return;
      }

      const { balance } = calculateBalance();

      // Overdraft / low balance check
      if (amount > balance && balance > 0) {
        showConfirmModal(
          '⚠️ Insufficient Balance Warning',
          `This expense of <strong>${formatCurrency(amount)}</strong> exceeds your current available balance of <strong>${formatCurrency(balance)}</strong>. Do you still wish to record this expense?`,
          () => {
            executeSaveExpense({
              type: 'expense',
              amount,
              category,
              description: description || `${category} Expense`,
              date,
              paymentMethod
            });
          },
          'Proceed Anyway',
          true
        );
        return;
      }

      await executeSaveExpense({
        type: 'expense',
        amount,
        category,
        description: description || `${category} Expense`,
        date,
        paymentMethod
      });
    });
  }

  async function executeSaveExpense(txData) {
    const submitBtn = document.querySelector('#add-expense-form button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    // Submit to Backend API
    const apiRes = await TransactionsAPI.create(txData);
    if (apiRes.success) {
      showToast(apiRes.message || `-${formatCurrency(txData.amount)} recorded in MySQL! 💸`, 'success');
    } else {
      saveTransaction(txData);
      showToast(`-${formatCurrency(txData.amount)} recorded for ${txData.category}! 💸`, 'success');
    }

    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 700);
  }
});
