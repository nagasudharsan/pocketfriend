/**
 * Pocket Friend - Authentication Handler (Sign Up & Login)
 * Integrated with Node.js / Express Backend & MySQL Database
 */

document.addEventListener('DOMContentLoaded', () => {
  initTheme();

  // Check if user is already logged in, redirect to dashboard
  checkAuth(false);

  // --- SIGNUP PAGE HANDLER ---
  const signupForm = document.getElementById('signup-form');
  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const nameInput = document.getElementById('signup-name');
      const emailInput = document.getElementById('signup-email');
      const passwordInput = document.getElementById('signup-password');
      const confirmPasswordInput = document.getElementById('signup-confirm-password');

      const name = nameInput.value.trim();
      const email = emailInput.value.trim().toLowerCase();
      const password = passwordInput.value;
      const confirmPassword = confirmPasswordInput.value;

      // 1. Validation
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

      // Disable button during request
      const submitBtn = signupForm.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating Account...';
      }

      try {
        // 2. Call Backend API
        const response = await AuthAPI.register(name, email, password);

        if (response.success) {
          // Do NOT automatically log in or set tokens here
          showToast(response.message || 'Account created successfully! Please log in.', 'success');

          // Smooth redirect to Login page with registered email pre-filled (NO passwords in URL)
          setTimeout(() => {
            window.location.href = `login.html?registered=true&email=${encodeURIComponent(email)}`;
          }, 700);
        } else {
          // If network error and backend is offline, support client fallback
          if (response.isNetworkError) {
            console.warn('[Auth] Backend unavailable, initializing local account for login.');
            const userId = 'usr_' + Date.now();
            const newUser = { id: userId, name, email, password, createdAt: new Date().toISOString() };
            saveUser(newUser);
            initNewUserData(userId);
            showToast('Account created successfully! Please log in.', 'success');
            setTimeout(() => {
              window.location.href = `login.html?registered=true&email=${encodeURIComponent(email)}`;
            }, 700);
          } else {
            showToast(response.message || 'Registration failed. Please try again.', 'error');
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.textContent = '✨ Create Free Account';
            }
          }
        }
      } catch (err) {
        showToast('Registration error occurred. Please try again.', 'error');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = '✨ Create Free Account';
        }
      }
    });
  }

  // --- LOGIN PAGE HANDLER ---
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    // Check URL parameters for pre-filling newly registered user email
    const urlParams = new URLSearchParams(window.location.search);
    const registeredEmail = urlParams.get('email');
    const isRegistered = urlParams.get('registered');

    if (registeredEmail) {
      const emailInput = document.getElementById('login-email');
      const passwordInput = document.getElementById('login-password');
      if (emailInput) {
        emailInput.value = registeredEmail;
      }
      if (passwordInput) {
        passwordInput.focus();
      }
      if (isRegistered === 'true') {
        showToast('Account created successfully! Please enter your password to log in.', 'success');
      }
      // Clean query parameters from URL bar without page reload
      if (window.history && window.history.replaceState) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } else {
      // Autofill remembered email if available
      const savedEmail = localStorage.getItem('pocketfriend_remember_email');
      if (savedEmail) {
        const emailInput = document.getElementById('login-email');
        if (emailInput) emailInput.value = savedEmail;
        const rememberCheckbox = document.getElementById('remember-me');
        if (rememberCheckbox) rememberCheckbox.checked = true;
      }
    }

    loginForm.addEventListener('submit', async (e) => {
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

      const submitBtn = loginForm.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Logging in...';
      }

      try {
        // Call Backend API
        const response = await AuthAPI.login(email, password);

        if (response.success && response.token) {
          setAuthToken(response.token);
          setCurrentUser(response.user);

          if (rememberMe) {
            localStorage.setItem('pocketfriend_remember_email', email);
          } else {
            localStorage.removeItem('pocketfriend_remember_email');
          }

          showToast(response.message || `Welcome back, ${response.user?.name || 'Student'}! 👋`, 'success');
          setTimeout(() => {
            window.location.href = 'dashboard.html';
          }, 600);
        } else {
          // If network error and backend is offline, check local credentials
          if (response.isNetworkError) {
            const users = getUsers();
            const matchedUser = users.find(u => u.email.toLowerCase() === email && u.password === password);
            if (matchedUser) {
              setCurrentUser(matchedUser);
              if (rememberMe) localStorage.setItem('pocketfriend_remember_email', email);
              showToast(`Welcome back, ${matchedUser.name}! 👋`, 'success');
              setTimeout(() => { window.location.href = 'dashboard.html'; }, 600);
              return;
            }
          }

          showToast(response.message || 'Invalid email or password. Please try again.', 'error');
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Log In &rarr;';
          }
        }
      } catch (err) {
        showToast('Login error occurred. Please try again.', 'error');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = 'Log In &rarr;';
        }
      }
    });

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
          'For security, password resets are processed by your Pocket Friend administrator. If you are using a local account, please contact support or re-register with your college email.',
          () => {},
          'Understood'
        );
      });
    }
  }
});
