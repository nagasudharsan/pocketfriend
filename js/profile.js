/**
 * Pocket Friend - Profile & Settings Controller
 * User Profile, Theme Preferences, Notification Toggles, Data Reset
 * Connected to Node.js / Express Backend & MySQL Database
 */

document.addEventListener('DOMContentLoaded', () => {
  if (!checkAuth(true)) return;

  setupLayout('profile');
  loadProfileAndSettings();
  bindProfileEvents();
});

async function loadProfileAndSettings() {
  let user = getCurrentUser();
  const settings = getSettings();
  const transactions = getTransactions();

  // Try to sync latest user profile from MySQL Backend
  const profileRes = await AuthAPI.getMe();
  if (profileRes.success && profileRes.user) {
    user = { ...user, ...profileRes.user };
    setCurrentUser(user);
  }

  if (user) {
    const nameInput = document.getElementById('profile-name');
    const emailInput = document.getElementById('profile-email');
    const headerName = document.getElementById('profile-header-name');
    const headerEmail = document.getElementById('profile-header-email');
    const memberSince = document.getElementById('profile-member-since');
    const txCount = document.getElementById('profile-tx-count');
    const avatarEl = document.getElementById('profile-avatar');

    if (nameInput) nameInput.value = user.name || '';
    if (emailInput) emailInput.value = user.email || '';
    if (headerName) headerName.textContent = user.name || 'Student';
    if (headerEmail) headerEmail.textContent = user.email || '';
    if (avatarEl) avatarEl.textContent = user.name ? user.name.charAt(0).toUpperCase() : 'S';
    if (txCount) txCount.textContent = `${transactions.length} Transactions`;
    if (memberSince) {
      memberSince.textContent = user.createdAt ? `Joined ${formatDate(user.createdAt.split('T')[0])}` : 'Active Student';
    }
  }

  // Settings Toggles
  const darkModeToggle = document.getElementById('setting-darkmode');
  const notificationsToggle = document.getElementById('setting-notifications');
  const budgetAlertsToggle = document.getElementById('setting-budgetalerts');
  const currencySelect = document.getElementById('setting-currency');

  const currentTheme = localStorage.getItem('pocketfriend_theme') || settings.theme || 'dark';
  if (darkModeToggle) darkModeToggle.checked = currentTheme !== 'light';
  if (notificationsToggle) notificationsToggle.checked = settings.notifications !== false;
  if (budgetAlertsToggle) budgetAlertsToggle.checked = settings.budgetAlerts !== false;
  if (currencySelect) currencySelect.value = user?.currency || settings.currency || 'INR';
}

function bindProfileEvents() {
  const profileForm = document.getElementById('profile-form');
  const darkModeToggle = document.getElementById('setting-darkmode');
  const clearDataBtn = document.getElementById('btn-clear-data');
  const reloadDemoBtn = document.getElementById('btn-reload-demo');
  const logoutBtn = document.getElementById('btn-profile-logout');

  // Save profile changes
  if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const nameInput = document.getElementById('profile-name');
      const emailInput = document.getElementById('profile-email');
      const notificationsToggle = document.getElementById('setting-notifications');
      const budgetAlertsToggle = document.getElementById('setting-budgetalerts');
      const currencySelect = document.getElementById('setting-currency');

      const name = nameInput.value.trim();
      const email = emailInput.value.trim();
      const currency = currencySelect ? currencySelect.value : 'INR';
      const currentTheme = localStorage.getItem('pocketfriend_theme') || 'dark';

      if (!name) {
        showToast('Please enter your name', 'error');
        return;
      }

      const currentUser = getCurrentUser();
      const updatedUser = {
        ...currentUser,
        name,
        email: email || currentUser.email,
        currency
      };

      setCurrentUser(updatedUser);
      saveUser(updatedUser);

      // Save Settings
      saveSettings({
        notifications: notificationsToggle ? notificationsToggle.checked : true,
        budgetAlerts: budgetAlertsToggle ? budgetAlertsToggle.checked : true,
        currency
      });

      // Update backend MySQL
      const apiRes = await AuthAPI.updateProfile({
        name,
        currency,
        theme: currentTheme
      });

      if (apiRes.success) {
        showToast('Profile & preferences saved in MySQL! ✨', 'success');
      } else {
        showToast('Profile & preferences saved! ✨', 'success');
      }

      loadProfileAndSettings();
    });
  }

  // Dark mode direct switch
  if (darkModeToggle) {
    darkModeToggle.addEventListener('change', (e) => {
      applyTheme(e.target.checked ? 'dark' : 'light');
    });
  }

  // Clear all personal data (Only for current user)
  if (clearDataBtn) {
    clearDataBtn.addEventListener('click', () => {
      showConfirmModal(
        '⚠️ Clear All Personal Data?',
        'This will erase all your recorded transactions, monthly budgets, and savings goals for your account. Are you sure you want to proceed?',
        () => {
          clearUserData();
          showToast('Account data reset to zero.', 'info');
          setTimeout(() => {
            window.location.href = 'dashboard.html';
          }, 700);
        },
        'Yes, Clear My Data',
        true
      );
    });
  }

  // Reload demo data for current user
  if (reloadDemoBtn) {
    reloadDemoBtn.addEventListener('click', () => {
      showConfirmModal(
        '🔄 Reload Sample Demo Data',
        'This will populate your account with sample demo transactions, budgets, and savings goals. Proceed?',
        () => {
          loadDemoDataForCurrentUser();
          showToast('Sample demo data loaded into your account! 🎉', 'success');
          setTimeout(() => {
            window.location.href = 'dashboard.html';
          }, 700);
        },
        'Load Demo Data'
      );
    });
  }

  // Logout button
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      showConfirmModal('Logout', 'Are you sure you want to log out of Pocket Friend?', () => {
        removeAuthToken();
        setCurrentUser(null);
        showToast('Logged out', 'info');
        setTimeout(() => {
          window.location.href = 'login.html';
        }, 400);
      });
    });
  }
}
