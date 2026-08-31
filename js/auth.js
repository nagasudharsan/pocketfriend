/**
 * Pocket Friend - Authentication Handler (Sign Up & Login)
 * Pure Vanilla JavaScript with User-Specific Data Isolation
 */

document.addEventListener('DOMContentLoaded', () => {
  initTheme();

  // Check if user is already logged in, redirect to dashboard
  checkAuth(false);

  // --- SIGNUP PAGE HANDLER ---
  const signupForm = document.getElementById('signup-form');
  if (signupForm) {
    signupForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const nameInput = document.getElementById('signup-name');
      const emailInput = document.getElementById('signup-email');
      const passwordInput = document.getElementById('signup-password');
      const confirmPasswordInput = document.getElementById('signup-confirm-password');

      const name = nameInput.value.trim();
      const email = emailInput.value.trim().toLowerCase();
      const password = passwordInput.value;
      const confirmPassword = confirmPasswordInput.value;

      // Validation
      if (!name) {
        showToast('Please enter your full name', 'error');
        nameInput.focus();
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email)) {
        showToast('Please enter a valid email address', 'error');
        emailInput.focus();
        return;
      }

      if (!password || password.length < 6) {
        showToast('Password must be at least 6 characters long', 'error');
        passwordInput.focus();
        return;
      }

      if (password !== confirmPassword) {
        showToast('Passwords do not match. Please re-check', 'error');
        confirmPasswordInput.focus();
        return;
      }

      const users = getUsers();
      const userExists = users.some(u => u.email.toLowerCase() === email);
      if (userExists) {
        showToast('An account with this email already exists. Please log in.', 'error');
        return;
      }

      // 1. Generate unique user ID
      const userId = 'usr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);

      const newUser = {
        id: userId,
        name,
        email: email,
        password,
        createdAt: new Date().toISOString()
      };

      // 2, 3, 4, 5, 6. Save user & initialize separate empty arrays (Zero balance, 0 tx, 0 budgets, 0 goals)
      saveUser(newUser);
      initNewUserData(userId);

      // 7. Set this user as currentUser
      setCurrentUser(newUser);

      showToast(`Welcome to Pocket Friend, ${name}! 🎉`, 'success');

      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 700);
    });
  }

  // --- LOGIN PAGE HANDLER ---
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const emailInput = document.getElementById('login-email');
      const passwordInput = document.getElementById('login-password');
      const rememberMe = document.getElementById('remember-me')?.checked;

      const email = emailInput.value.trim().toLowerCase();
      const password = passwordInput.value;

      if (!email || !password) {
        showToast('Please enter both email and password', 'error');
        return;
      }

      const users = getUsers();
      const matchedUser = users.find(u => u.email.toLowerCase() === email && u.password === password);

      if (matchedUser) {
        // Set currentUser - only matchedUser's isolated data will be loaded
        setCurrentUser(matchedUser);
        if (rememberMe) {
          localStorage.setItem('pocketfriend_remember_email', email);
        } else {
          localStorage.removeItem('pocketfriend_remember_email');
        }

        showToast(`Welcome back, ${matchedUser.name}! 👋`, 'success');
        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 600);
      } else {
        // Special check for demo credentials
        if ((email === 'demo@pocketfriend.com' || email === 'demo@pocketpal.com') && password === 'demo123') {
          const demoUser = initDemoData(false);
          setCurrentUser(demoUser);
          showToast('Welcome to Pocket Friend Demo! 🎉', 'success');
          setTimeout(() => {
            window.location.href = 'dashboard.html';
          }, 600);
        } else {
          showToast('Invalid email or password. Please try again.', 'error');
        }
      }
    });

    // Autofill remembered email if available
    const savedEmail = localStorage.getItem('pocketfriend_remember_email') || localStorage.getItem('pocketpal_remember_email');
    if (savedEmail) {
      const emailInput = document.getElementById('login-email');
      if (emailInput) emailInput.value = savedEmail;
      const rememberCheckbox = document.getElementById('remember-me');
      if (rememberCheckbox) rememberCheckbox.checked = true;
    }

    // Quick 1-Click Demo Login Handler
    const demoLoginBtn = document.getElementById('btn-quick-demo');
    if (demoLoginBtn) {
      demoLoginBtn.addEventListener('click', () => {
        const demoUser = initDemoData(false);
        setCurrentUser(demoUser);
        showToast('Logged in as Demo Student! 🎉', 'success');
        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 500);
      });
    }

    // Forgot password info handler
    const forgotPasswordLink = document.getElementById('forgot-password-link');
    if (forgotPasswordLink) {
      forgotPasswordLink.addEventListener('click', (e) => {
        e.preventDefault();
        showConfirmModal(
          'Password Reset Info',
          'Pocket Friend is a client-side student privacy application where all accounts are stored securely in your local browser storage. For the demo account, use email: <b>demo@pocketfriend.com</b> and password: <b>demo123</b>.',
          () => {},
          'Understood'
        );
      });
    }
  }
});
