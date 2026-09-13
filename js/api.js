/**
 * Pocket Friend - Centralized Frontend API Client
 * Connects Frontend directly to Node.js / Express Backend (http://localhost:5000/api)
 */

const API_CONFIG = {
  BASE_URL: 'http://localhost:5000/api',
  TOKEN_KEY: 'pocketfriend_auth_token',
  USER_KEY: 'pocketfriend_current_user'
};

// Authentication Token Helpers
function getAuthToken() {
  return localStorage.getItem(API_CONFIG.TOKEN_KEY) || null;
}

function setAuthToken(token) {
  if (token) {
    localStorage.setItem(API_CONFIG.TOKEN_KEY, token);
  } else {
    localStorage.removeItem(API_CONFIG.TOKEN_KEY);
  }
}

function removeAuthToken() {
  localStorage.removeItem(API_CONFIG.TOKEN_KEY);
  localStorage.removeItem(API_CONFIG.USER_KEY);
}

// Universal API Request Wrapper
async function apiRequest(endpoint, options = {}) {
  const url = `${API_CONFIG.BASE_URL}${endpoint}`;
  const token = getAuthToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/register')) {
        removeAuthToken();
        showToast('Session expired. Please log in again.', 'error');
        setTimeout(() => {
          window.location.href = 'login.html';
        }, 800);
      }
      const errorMsg = data.message || `Request failed with status ${response.status}`;
      return { success: false, status: response.status, message: errorMsg, data: null };
    }

    return { success: true, status: response.status, message: data.message, ...data };
  } catch (err) {
    console.warn(`[API Connection Error] Endpoint: ${endpoint}:`, err.message);
    return {
      success: false,
      isNetworkError: true,
      message: 'Unable to connect to the backend server. Please verify MySQL and Express are running.'
    };
  }
}

// ----------------------------------------------------------------------------
// API Methods
// ----------------------------------------------------------------------------

const AuthAPI = {
  async register(name, email, password) {
    return apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password })
    });
  },

  async login(email, password) {
    return apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  },

  async getMe() {
    return apiRequest('/auth/me', { method: 'GET' });
  },

  async updateProfile(profileData) {
    return apiRequest('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    });
  }
};

const TransactionsAPI = {
  async getAll(params = {}) {
    const query = new URLSearchParams();
    if (params.type) query.append('type', params.type);
    if (params.category && params.category !== 'all') query.append('category', params.category);
    if (params.search) query.append('search', params.search);
    if (params.sort) query.append('sort', params.sort);
    if (params.limit) query.append('limit', params.limit);

    const qs = query.toString() ? `?${query.toString()}` : '';
    return apiRequest(`/transactions${qs}`, { method: 'GET' });
  },

  async getById(id) {
    return apiRequest(`/transactions/${id}`, { method: 'GET' });
  },

  async create(txData) {
    return apiRequest('/transactions', {
      method: 'POST',
      body: JSON.stringify(txData)
    });
  },

  async update(id, txData) {
    return apiRequest(`/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(txData)
    });
  },

  async delete(id) {
    return apiRequest(`/transactions/${id}`, {
      method: 'DELETE'
    });
  }
};

const CategoriesAPI = {
  async getAll(type = null) {
    const qs = type ? `?type=${type}` : '';
    return apiRequest(`/categories${qs}`, { method: 'GET' });
  },

  async create(catData) {
    return apiRequest('/categories', {
      method: 'POST',
      body: JSON.stringify(catData)
    });
  },

  async update(id, catData) {
    return apiRequest(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(catData)
    });
  },

  async delete(id) {
    return apiRequest(`/categories/${id}`, {
      method: 'DELETE'
    });
  }
};

const DashboardAPI = {
  async getSummary() {
    return apiRequest('/dashboard/summary', { method: 'GET' });
  }
};

// Global Exposure
window.AuthAPI = AuthAPI;
window.TransactionsAPI = TransactionsAPI;
window.CategoriesAPI = CategoriesAPI;
window.DashboardAPI = DashboardAPI;
window.getAuthToken = getAuthToken;
window.setAuthToken = setAuthToken;
window.removeAuthToken = removeAuthToken;
