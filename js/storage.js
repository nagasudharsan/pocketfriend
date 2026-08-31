/**
 * Pocket Friend - Central Storage & Core Utility Engine
 * User-Isolated Vanilla JavaScript Storage Architecture
 * Responsive Desktop & Mobile App Engine
 */

const STORAGE_KEYS = {
  USERS: 'pocketfriend_users',
  CURRENT_USER: 'pocketfriend_current_user'
};

const DEFAULT_SETTINGS = {
  theme: 'dark',
  currency: 'INR',
  notifications: true,
  budgetAlerts: true
};

// Generic LocalStorage Raw Helpers
function saveData(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error('Error saving data to localStorage:', e);
    return false;
  }
}

function getData(key, defaultValue = null) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    console.error('Error reading data from localStorage:', e);
    return defaultValue;
  }
}

function removeData(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (e) {
    console.error('Error removing data from localStorage:', e);
    return false;
  }
}

// User-Specific Storage Key Resolver
function getActiveUserId(userId = null) {
  if (userId) return userId;
  const current = getCurrentUser();
  return current ? current.id : 'guest';
}

function getUserStorageKey(keyType, userId = null) {
  const uid = getActiveUserId(userId);
  const newKey = `pocketfriend_user_${uid}_${keyType}`;
  const oldKey = `pocketpal_user_${uid}_${keyType}`;
  if (localStorage.getItem(oldKey) !== null && localStorage.getItem(newKey) === null) {
    localStorage.setItem(newKey, localStorage.getItem(oldKey));
  }
  return newKey;
}

// Cleanup Legacy Global Storage Keys (Prevent shared data leaks)
function cleanupLegacyGlobalData() {
  const legacyKeys = [
    'pocketfriend_transactions',
    'pocketfriend_budgets',
    'pocketfriend_goals',
    'pocketfriend_settings',
    'pocketpal_transactions',
    'pocketpal_budgets',
    'pocketpal_goals',
    'pocketpal_settings',
    'transactions',
    'budgets',
    'goals',
    'expenses',
    'income',
    'pocketMoney',
    'userData'
  ];
  legacyKeys.forEach(k => {
    try {
      localStorage.removeItem(k);
    } catch (e) {}
  });
}

// ==========================================
// USER & AUTHENTICATION STORAGE
// ==========================================

function getUsers() {
  let users = getData(STORAGE_KEYS.USERS, null);
  if (users === null) {
    users = getData('pocketpal_users', []);
    if (users && users.length > 0) {
      saveData(STORAGE_KEYS.USERS, users);
    }
  }
  return users || [];
}

function saveUser(user) {
  const users = getUsers();
  const existingIdx = users.findIndex(u => u.email.toLowerCase() === user.email.toLowerCase() || u.id === user.id);
  if (existingIdx >= 0) {
    users[existingIdx] = { ...users[existingIdx], ...user };
  } else {
    users.push({
      id: user.id || 'usr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      name: user.name,
      email: user.email.toLowerCase(),
      password: user.password,
      createdAt: user.createdAt || new Date().toISOString()
    });
  }
  saveData(STORAGE_KEYS.USERS, users);
}

function getCurrentUser() {
  let cur = getData(STORAGE_KEYS.CURRENT_USER, null);
  if (cur === null) {
    cur = getData('pocketpal_current_user', null);
    if (cur) {
      saveData(STORAGE_KEYS.CURRENT_USER, cur);
    }
  }
  return cur;
}

function setCurrentUser(user) {
  if (!user) {
    removeData(STORAGE_KEYS.CURRENT_USER);
  } else {
    saveData(STORAGE_KEYS.CURRENT_USER, {
      id: user.id,
      name: user.name,
      email: user.email.toLowerCase()
    });
  }
}

// Initialize New User Isolated Storage (Zero Balances & Empty Arrays)
function initNewUserData(userId) {
  if (!userId) return;
  saveUserTransactions([], userId);
  saveUserBudgets([], userId);
  saveUserGoals([], userId);
  saveUserSettings(DEFAULT_SETTINGS, userId);
}

// Clear only the specified user's financial data
function clearUserData(userId = null) {
  const uid = getActiveUserId(userId);
  saveUserTransactions([], uid);
  saveUserBudgets([], uid);
  saveUserGoals([], uid);
}

// ==========================================
// USER TRANSACTIONS CRUD (ISOLATED)
// ==========================================

function getUserTransactions(userId = null) {
  const key = getUserStorageKey('transactions', userId);
  return getData(key, []);
}
const getTransactions = getUserTransactions;

function saveUserTransactions(transactions, userId = null) {
  const key = getUserStorageKey('transactions', userId);
  return saveData(key, transactions);
}

function saveTransaction(transaction, userId = null) {
  const uid = getActiveUserId(userId);
  const transactions = getUserTransactions(uid);
  const newTx = {
    id: transaction.id || 'tx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
    type: transaction.type, // 'income' | 'expense'
    amount: Number(transaction.amount),
    category: transaction.category,
    description: transaction.description || transaction.category,
    date: transaction.date || new Date().toISOString().split('T')[0],
    paymentMethod: transaction.paymentMethod || 'UPI',
    createdAt: transaction.createdAt || new Date().toISOString()
  };
  transactions.unshift(newTx);
  saveUserTransactions(transactions, uid);
  return newTx;
}

function updateTransaction(updatedTx, userId = null) {
  const uid = getActiveUserId(userId);
  const transactions = getUserTransactions(uid);
  const index = transactions.findIndex(t => t.id === updatedTx.id);
  if (index !== -1) {
    transactions[index] = {
      ...transactions[index],
      ...updatedTx,
      amount: Number(updatedTx.amount)
    };
    saveUserTransactions(transactions, uid);
    return true;
  }
  return false;
}

function deleteTransaction(id, userId = null) {
  const uid = getActiveUserId(userId);
  let transactions = getUserTransactions(uid);
  transactions = transactions.filter(t => t.id !== id);
  saveUserTransactions(transactions, uid);
}

// ==========================================
// USER BUDGETS CRUD (ISOLATED)
// ==========================================

function getUserBudgets(userId = null) {
  const key = getUserStorageKey('budgets', userId);
  return getData(key, []);
}
const getBudgets = getUserBudgets;

function saveUserBudgets(budgets, userId = null) {
  const key = getUserStorageKey('budgets', userId);
  return saveData(key, budgets);
}

function saveBudget(budget, userId = null) {
  const uid = getActiveUserId(userId);
  const budgets = getUserBudgets(uid);
  const currentMonth = budget.month || new Date().toISOString().slice(0, 7); // 'YYYY-MM'
  const existingIdx = budgets.findIndex(b => b.category.toLowerCase() === budget.category.toLowerCase() && b.month === currentMonth);
  
  if (existingIdx >= 0) {
    budgets[existingIdx].amount = Number(budget.amount);
  } else {
    budgets.push({
      id: budget.id || 'bdg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      category: budget.category,
      amount: Number(budget.amount),
      month: currentMonth
    });
  }
  saveUserBudgets(budgets, uid);
}

function updateBudget(updatedBudget, userId = null) {
  const uid = getActiveUserId(userId);
  const budgets = getUserBudgets(uid);
  const index = budgets.findIndex(b => b.id === updatedBudget.id);
  if (index !== -1) {
    budgets[index] = {
      ...budgets[index],
      ...updatedBudget,
      amount: Number(updatedBudget.amount)
    };
    saveUserBudgets(budgets, uid);
    return true;
  }
  return false;
}

function deleteBudget(id, userId = null) {
  const uid = getActiveUserId(userId);
  let budgets = getUserBudgets(uid);
  budgets = budgets.filter(b => b.id !== id);
  saveUserBudgets(budgets, uid);
}

// ==========================================
// USER SAVINGS GOALS CRUD (ISOLATED)
// ==========================================

function getUserGoals(userId = null) {
  const key = getUserStorageKey('goals', userId);
  return getData(key, []);
}
const getGoals = getUserGoals;

function saveUserGoals(goals, userId = null) {
  const key = getUserStorageKey('goals', userId);
  return saveData(key, goals);
}

function saveGoal(goal, userId = null) {
  const uid = getActiveUserId(userId);
  const goals = getUserGoals(uid);
  const newGoal = {
    id: goal.id || 'goal_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    name: goal.name,
    targetAmount: Number(goal.targetAmount),
    savedAmount: Number(goal.savedAmount || 0),
    targetDate: goal.targetDate || '',
    description: goal.description || '',
    createdAt: goal.createdAt || new Date().toISOString()
  };
  goals.unshift(newGoal);
  saveUserGoals(goals, uid);
  return newGoal;
}

function updateGoal(updatedGoal, userId = null) {
  const uid = getActiveUserId(userId);
  const goals = getUserGoals(uid);
  const index = goals.findIndex(g => g.id === updatedGoal.id);
  if (index !== -1) {
    goals[index] = {
      ...goals[index],
      ...updatedGoal,
      targetAmount: Number(updatedGoal.targetAmount),
      savedAmount: Number(updatedGoal.savedAmount)
    };
    saveUserGoals(goals, uid);
    return true;
  }
  return false;
}

function deleteGoal(id, userId = null) {
  const uid = getActiveUserId(userId);
  let goals = getUserGoals(uid);
  goals = goals.filter(g => g.id !== id);
  saveUserGoals(goals, uid);
}

function addGoalSavings(goalId, amount, userId = null) {
  const uid = getActiveUserId(userId);
  const goals = getUserGoals(uid);
  const goal = goals.find(g => g.id === goalId);
  if (goal) {
    goal.savedAmount = Math.min(goal.targetAmount, Number(goal.savedAmount) + Number(amount));
    saveUserGoals(goals, uid);
    return goal;
  }
  return null;
}

// ==========================================
// USER SETTINGS STORAGE (ISOLATED)
// ==========================================

function getUserSettings(userId = null) {
  const key = getUserStorageKey('settings', userId);
  return getData(key, DEFAULT_SETTINGS);
}
const getSettings = getUserSettings;

function saveUserSettings(settings, userId = null) {
  const uid = getActiveUserId(userId);
  const current = getUserSettings(uid);
  const updated = { ...current, ...settings };
  const key = getUserStorageKey('settings', uid);
  saveData(key, updated);
  return updated;
}
const saveSettings = saveUserSettings;

// ==========================================
// DYNAMIC FINANCIAL CALCULATIONS
// ==========================================

function calculateBalance(userId = null) {
  const transactions = getUserTransactions(userId);
  let totalIncome = 0;
  let totalExpenses = 0;

  transactions.forEach(t => {
    const amt = Number(t.amount) || 0;
    if (t.type === 'income') {
      totalIncome += amt;
    } else if (t.type === 'expense') {
      totalExpenses += amt;
    }
  });

  const balance = totalIncome - totalExpenses;
  const savings = balance;

  return {
    totalIncome,
    totalExpenses,
    balance,
    savings
  };
}

function getMonthlyExpenses(monthStr, userId = null) {
  const currentMonth = monthStr || new Date().toISOString().slice(0, 7);
  const transactions = getUserTransactions(userId);
  return transactions.filter(t => t.type === 'expense' && t.date && t.date.startsWith(currentMonth));
}

function getMonthlyIncome(monthStr, userId = null) {
  const currentMonth = monthStr || new Date().toISOString().slice(0, 7);
  const transactions = getUserTransactions(userId);
  return transactions.filter(t => t.type === 'income' && t.date && t.date.startsWith(currentMonth));
}

// ==========================================
// FORMATTING UTILITIES
// ==========================================

function formatCurrency(amount) {
  const num = Number(amount) || 0;
  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0
  }).format(num);
  return `₹${formatted}`;
}

function formatDate(dateString) {
  if (!dateString) return '';
  const parts = dateString.split('-');
  if (parts.length !== 3) return dateString;
  
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const compareDate = new Date(d);
  compareDate.setHours(0, 0, 0, 0);

  if (compareDate.getTime() === today.getTime()) {
    return 'Today';
  }
  if (compareDate.getTime() === yesterday.getTime()) {
    return 'Yesterday';
  }

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Category Meta Mapping
const CATEGORY_META = {
  'Food': { icon: '🍔', color: '#f59e0b', name: 'Food & Snacks' },
  'Transport': { icon: '🚌', color: '#3b82f6', name: 'Transport' },
  'Education': { icon: '📚', color: '#6366f1', name: 'Education & Books' },
  'Entertainment': { icon: '🎮', color: '#ec4899', name: 'Entertainment' },
  'Shopping': { icon: '🛍️', color: '#8b5cf6', name: 'Shopping' },
  'Bills': { icon: '⚡', color: '#ef4444', name: 'Bills & Recharge' },
  'Pocket Money': { icon: '💰', color: '#10b981', name: 'Pocket Money' },
  'Parents': { icon: '👨‍👩‍👧', color: '#059669', name: 'Parents' },
  'Gift': { icon: '🎁', color: '#f43f5e', name: 'Gift' },
  'Scholarship': { icon: '🎓', color: '#0284c7', name: 'Scholarship' },
  'Other': { icon: '✨', color: '#64748b', name: 'Other' }
};

function getCategoryMeta(categoryName) {
  if (CATEGORY_META[categoryName]) {
    return CATEGORY_META[categoryName];
  }
  return { icon: '🏷️', color: '#8b5cf6', name: categoryName || 'Other' };
}

// ==========================================
// USER CUSTOM CATEGORIES (ISOLATED - EXPENSE & INCOME)
// ==========================================

// Expense Custom Categories
function getUserCustomCategories(userId = null) {
  const key = getUserStorageKey('custom_categories', userId);
  return getData(key, []);
}
const getCustomCategories = getUserCustomCategories;
const getUserCustomExpenseCategories = getUserCustomCategories;

function saveUserCustomCategories(categories, userId = null) {
  const key = getUserStorageKey('custom_categories', userId);
  return saveData(key, categories);
}
const saveCustomCategories = saveUserCustomCategories;
const saveUserCustomExpenseCategories = saveUserCustomCategories;

function addCustomCategory(categoryName, userId = null) {
  const uid = getActiveUserId(userId);
  const trimmed = (categoryName || '').trim();
  if (!trimmed) return { success: false, message: 'Category name cannot be empty.' };

  const existing = getUserCustomCategories(uid);
  const standard = ['Food', 'Transport', 'Education', 'Entertainment', 'Shopping', 'Bills', 'Other'];

  // Check duplicate (case-insensitive)
  const isDuplicate = standard.some(c => c.toLowerCase() === trimmed.toLowerCase()) ||
                      existing.some(c => c.toLowerCase() === trimmed.toLowerCase());

  if (isDuplicate) {
    return { success: false, message: `Category "${trimmed}" already exists.` };
  }

  existing.push(trimmed);
  saveUserCustomCategories(existing, uid);
  return { success: true, name: trimmed };
}
const addCustomExpenseCategory = addCustomCategory;

function removeCustomCategory(categoryName, userId = null) {
  const uid = getActiveUserId(userId);
  let existing = getUserCustomCategories(uid);
  existing = existing.filter(c => c.toLowerCase() !== (categoryName || '').trim().toLowerCase());
  saveUserCustomCategories(existing, uid);
  return true;
}
const removeCustomExpenseCategory = removeCustomCategory;

// Income Custom Categories
function getUserCustomIncomeCategories(userId = null) {
  const key = getUserStorageKey('custom_income_categories', userId);
  return getData(key, []);
}
const getCustomIncomeCategories = getUserCustomIncomeCategories;

function saveUserCustomIncomeCategories(categories, userId = null) {
  const key = getUserStorageKey('custom_income_categories', userId);
  return saveData(key, categories);
}
const saveCustomIncomeCategories = saveUserCustomIncomeCategories;

function addCustomIncomeCategory(categoryName, userId = null) {
  const uid = getActiveUserId(userId);
  const trimmed = (categoryName || '').trim();
  if (!trimmed) return { success: false, message: 'Category name cannot be empty.' };

  const existing = getUserCustomIncomeCategories(uid);
  const standard = ['Allowance', 'Pocket Money', 'Parents', 'Gift', 'Scholarship', 'Other'];

  // Check duplicate (case-insensitive)
  const isDuplicate = standard.some(c => c.toLowerCase() === trimmed.toLowerCase()) ||
                      existing.some(c => c.toLowerCase() === trimmed.toLowerCase());

  if (isDuplicate) {
    return { success: false, message: `Category "${trimmed}" already exists.` };
  }

  existing.push(trimmed);
  saveUserCustomIncomeCategories(existing, uid);
  return { success: true, name: trimmed };
}

function removeCustomIncomeCategory(categoryName, userId = null) {
  const uid = getActiveUserId(userId);
  let existing = getUserCustomIncomeCategories(uid);
  existing = existing.filter(c => c.toLowerCase() !== (categoryName || '').trim().toLowerCase());
  saveUserCustomIncomeCategories(existing, uid);
  return true;
}

// ==========================================
// DEMO ACCOUNT DATA (SCOPED TO DEMO USER)
// ==========================================

function initDemoData(force = false) {
  const DEMO_USER_ID = 'demo_user_001';
  const users = getUsers();

  let demoUser = users.find(u => u.email === 'demo@pocketfriend.com' || u.email === 'demo@pocketpal.com' || u.id === DEMO_USER_ID);
  if (!demoUser) {
    demoUser = {
      id: DEMO_USER_ID,
      name: 'Alex Sharma',
      email: 'demo@pocketfriend.com',
      password: 'demo123',
      createdAt: new Date().toISOString()
    };
    users.push(demoUser);
    saveData(STORAGE_KEYS.USERS, users);
  }

  const existingDemoTx = getUserTransactions(DEMO_USER_ID);
  if (existingDemoTx.length === 0 || force) {
    const today = new Date().toISOString().split('T')[0];
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = yesterdayDate.toISOString().split('T')[0];

    const sampleTransactions = [
      { id: 'tx_demo_1', type: 'income', amount: 2000, category: 'Pocket Money', description: 'Monthly Pocket Money from Dad', date: today, paymentMethod: 'UPI', createdAt: new Date().toISOString() },
      { id: 'tx_demo_2', type: 'income', amount: 1000, category: 'Gift', description: 'Birthday Gift from Uncle', date: today, paymentMethod: 'Cash', createdAt: new Date().toISOString() },
      { id: 'tx_demo_3', type: 'income', amount: 2000, category: 'Parents', description: 'Allowance from Mom', date: yesterday, paymentMethod: 'UPI', createdAt: new Date().toISOString() },
      { id: 'tx_demo_4', type: 'expense', amount: 500, category: 'Food', description: 'Campus Lunch & Cafe', date: today, paymentMethod: 'UPI', createdAt: new Date().toISOString() },
      { id: 'tx_demo_5', type: 'expense', amount: 300, category: 'Transport', description: 'Metro Pass Recharge', date: today, paymentMethod: 'Card', createdAt: new Date().toISOString() },
      { id: 'tx_demo_6', type: 'expense', amount: 700, category: 'Education', description: 'Reference Books', date: yesterday, paymentMethod: 'UPI', createdAt: new Date().toISOString() },
      { id: 'tx_demo_7', type: 'expense', amount: 400, category: 'Entertainment', description: 'Movie Ticket', date: yesterday, paymentMethod: 'UPI', createdAt: new Date().toISOString() },
      { id: 'tx_demo_8', type: 'expense', amount: 650, category: 'Shopping', description: 'Campus Hoodie', date: yesterday, paymentMethod: 'Card', createdAt: new Date().toISOString() }
    ];
    saveUserTransactions(sampleTransactions, DEMO_USER_ID);

    const currentMonth = new Date().toISOString().slice(0, 7);
    const sampleBudgets = [
      { id: 'bdg_1', category: 'Food', amount: 1500, month: currentMonth },
      { id: 'bdg_2', category: 'Transport', amount: 800, month: currentMonth },
      { id: 'bdg_3', category: 'Entertainment', amount: 1000, month: currentMonth },
      { id: 'bdg_4', category: 'Education', amount: 1500, month: currentMonth }
    ];
    saveUserBudgets(sampleBudgets, DEMO_USER_ID);

    const sampleGoals = [
      { id: 'goal_1', name: '🎧 Wireless Headphones', targetAmount: 5000, savedAmount: 1200, targetDate: '2026-12-31', description: 'Noise Cancelling Headphones', createdAt: new Date().toISOString() },
      { id: 'goal_2', name: '🎮 Gaming Controller', targetAmount: 3000, savedAmount: 1200, targetDate: '2026-10-15', description: 'Wireless controller for PC', createdAt: new Date().toISOString() },
      { id: 'goal_3', name: '🎓 Laptop Fund', targetAmount: 20000, savedAmount: 7500, targetDate: '2027-05-30', description: 'Savings for laptop upgrade', createdAt: new Date().toISOString() }
    ];
    saveUserGoals(sampleGoals, DEMO_USER_ID);
    saveUserSettings(DEFAULT_SETTINGS, DEMO_USER_ID);
  }
  return demoUser;
}

function loadDemoDataForCurrentUser() {
  const user = getCurrentUser();
  if (!user) return;
  const today = new Date().toISOString().split('T')[0];
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = yesterdayDate.toISOString().split('T')[0];

  const sampleTransactions = [
    { id: 'tx_' + Date.now() + '_1', type: 'income', amount: 2000, category: 'Pocket Money', description: 'Monthly Pocket Money from Dad', date: today, paymentMethod: 'UPI', createdAt: new Date().toISOString() },
    { id: 'tx_' + Date.now() + '_2', type: 'income', amount: 1000, category: 'Gift', description: 'Birthday Gift from Uncle', date: today, paymentMethod: 'Cash', createdAt: new Date().toISOString() },
    { id: 'tx_' + Date.now() + '_3', type: 'income', amount: 2000, category: 'Parents', description: 'Allowance from Mom', date: yesterday, paymentMethod: 'UPI', createdAt: new Date().toISOString() },
    { id: 'tx_' + Date.now() + '_4', type: 'expense', amount: 500, category: 'Food', description: 'Campus Lunch & Cafe', date: today, paymentMethod: 'UPI', createdAt: new Date().toISOString() },
    { id: 'tx_' + Date.now() + '_5', type: 'expense', amount: 300, category: 'Transport', description: 'Metro Pass Recharge', date: today, paymentMethod: 'Card', createdAt: new Date().toISOString() },
    { id: 'tx_' + Date.now() + '_6', type: 'expense', amount: 700, category: 'Education', description: 'Reference Books', date: yesterday, paymentMethod: 'UPI', createdAt: new Date().toISOString() }
  ];
  saveUserTransactions(sampleTransactions, user.id);

  const currentMonth = new Date().toISOString().slice(0, 7);
  const sampleBudgets = [
    { id: 'bdg_' + Date.now() + '_1', category: 'Food', amount: 1500, month: currentMonth },
    { id: 'bdg_' + Date.now() + '_2', category: 'Transport', amount: 800, month: currentMonth }
  ];
  saveUserBudgets(sampleBudgets, user.id);

  const sampleGoals = [
    { id: 'goal_' + Date.now() + '_1', name: '🎧 Wireless Headphones', targetAmount: 5000, savedAmount: 1200, targetDate: '2026-12-31', description: 'Noise Cancelling Headphones', createdAt: new Date().toISOString() }
  ];
  saveUserGoals(sampleGoals, user.id);
}

// ==========================================
// UI TOASTS & MODALS
// ==========================================

function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  if (type === 'error') icon = '❌';

  toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

function showConfirmModal(title, message, onConfirm, confirmText = 'Confirm', isDanger = false) {
  let modalBackdrop = document.getElementById('app-confirm-modal');
  if (!modalBackdrop) {
    modalBackdrop = document.createElement('div');
    modalBackdrop.id = 'app-confirm-modal';
    modalBackdrop.className = 'modal-backdrop';
    document.body.appendChild(modalBackdrop);
  }

  modalBackdrop.innerHTML = `
    <div class="modal-card">
      <div class="modal-header">
        <h3 class="modal-title">${title}</h3>
        <button class="modal-close-btn" id="modal-cancel-x">&times;</button>
      </div>
      <p style="color: var(--text-secondary); font-size: 14.5px; line-height: 1.6; margin-bottom: 20px;">
        ${message}
      </p>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="modal-cancel-btn">Cancel</button>
        <button class="btn ${isDanger ? 'btn-danger' : 'btn-primary'}" id="modal-confirm-btn">${confirmText}</button>
      </div>
    </div>
  `;

  modalBackdrop.classList.add('active');

  const close = () => {
    modalBackdrop.classList.remove('active');
  };

  document.getElementById('modal-cancel-x').onclick = close;
  document.getElementById('modal-cancel-btn').onclick = close;
  document.getElementById('modal-confirm-btn').onclick = () => {
    close();
    if (typeof onConfirm === 'function') onConfirm();
  };
}

// ==========================================
// THEME CONTROLLER
// ==========================================

function initTheme() {
  const settings = getSettings();
  const savedTheme = localStorage.getItem('pocketfriend_theme') || settings.theme || 'dark';
  applyTheme(savedTheme);
}

function applyTheme(theme) {
  if (theme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
    document.body.classList.add('light-mode');
    document.body.classList.remove('dark-mode');
  } else {
    document.documentElement.removeAttribute('data-theme');
    document.body.classList.remove('light-mode');
    document.body.classList.add('dark-mode');
  }
  localStorage.setItem('pocketfriend_theme', theme);
  saveSettings({ theme });
  updateThemeIcon(theme);
}

function toggleTheme() {
  const currentTheme = localStorage.getItem('pocketfriend_theme') || 'dark';
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  applyTheme(newTheme);
  showToast(`Switched to ${newTheme} theme`, 'info');
}

function updateThemeIcon(theme) {
  const themeBtns = document.querySelectorAll('.theme-toggle-btn');
  themeBtns.forEach(btn => {
    btn.innerHTML = theme === 'light' ? '🌙' : '☀️';
    btn.title = theme === 'light' ? 'Switch to Dark Theme' : 'Switch to Light Theme';
  });
}

// ==========================================
// SPLASH SCREEN CONTROLLER
// ==========================================

function initSplashScreen(force = false) {
  const hasSeenSplash = sessionStorage.getItem('pocketfriend_splash_shown');
  const splashEl = document.getElementById('app-splash-screen');
  
  if (splashEl) {
    if (!hasSeenSplash || force) {
      sessionStorage.setItem('pocketfriend_splash_shown', 'true');
      setTimeout(() => {
        splashEl.classList.add('hide');
        setTimeout(() => splashEl.remove(), 600);
      }, 1200);
    } else {
      splashEl.remove();
    }
  }
}

// ==========================================
// PWA SERVICE WORKER REGISTRATION
// ==========================================

function registerServiceWorker() {
  if ('serviceWorker' in navigator && (window.location.protocol === 'http:' || window.location.protocol === 'https:')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./service-worker.js')
        .then((reg) => {
          console.log('[Pocket Friend PWA] Service Worker active:', reg.scope);
        })
        .catch((err) => {
          console.warn('[Pocket Friend PWA] SW skip:', err);
        });
    });
  }
}

// ==========================================
// AUTHENTICATION GUARD & RESPONSIVE LAYOUT
// ==========================================

function checkAuth(requireAuth = true) {
  const currentUser = getCurrentUser();
  const currentPath = window.location.pathname.toLowerCase();

  if (requireAuth && !currentUser) {
    window.location.href = 'login.html';
    return false;
  }
  if (!requireAuth && currentUser && (currentPath.includes('login.html') || currentPath.includes('signup.html'))) {
    window.location.href = 'dashboard.html';
    return false;
  }
  return true;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function setupLayout(activePage = 'dashboard') {
  initTheme();
  registerServiceWorker();

  const user = getCurrentUser() || { name: 'Student', email: 'student@pocketfriend.com' };

  // Update greetings
  const greetingEls = document.querySelectorAll('.user-greeting-text');
  greetingEls.forEach(el => {
    el.textContent = `${getGreeting()}, ${user.name.split(' ')[0]} 👋`;
  });

  // Update user avatars (both desktop and mobile)
  const avatarEls = document.querySelectorAll('.user-avatar-circle, #user-avatar');
  avatarEls.forEach(el => {
    el.textContent = user.name ? user.name.charAt(0).toUpperCase() : 'S';
  });

  // Update user names & emails
  const nameEls = document.querySelectorAll('.user-name-display');
  nameEls.forEach(el => el.textContent = user.name);

  const emailEls = document.querySelectorAll('.user-email-display');
  emailEls.forEach(el => el.textContent = user.email);

  // Sync theme toggle buttons
  const themeBtns = document.querySelectorAll('.theme-toggle-btn');
  themeBtns.forEach(btn => {
    btn.onclick = toggleTheme;
  });

  // Highlight active page on Desktop Sidebar
  const sidebarItems = document.querySelectorAll('.sidebar .nav-item');
  sidebarItems.forEach(item => {
    if (item.getAttribute('data-page') === activePage) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Highlight active page on Mobile Bottom Nav
  const bottomNavItems = document.querySelectorAll('.bottom-nav .nav-item');
  bottomNavItems.forEach(item => {
    if (item.getAttribute('data-page') === activePage) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Logout Buttons
  const logoutBtns = document.querySelectorAll('.btn-logout');
  logoutBtns.forEach(btn => {
    btn.onclick = (e) => {
      e.preventDefault();
      showConfirmModal('Logout', 'Are you sure you want to log out of Pocket Friend?', () => {
        setCurrentUser(null);
        showToast('Logged out successfully', 'info');
        setTimeout(() => {
          window.location.href = 'login.html';
        }, 400);
      });
    };
  });
}

// Clean up legacy global localStorage keys
cleanupLegacyGlobalData();
