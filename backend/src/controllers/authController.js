/**
 * Pocket Friend Backend - Authentication Controller
 * Registration, Login, Profile, JWT Generation
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

// Standard default categories to seed for new registered users
const DEFAULT_CATEGORIES = [
  { name: 'Food', type: 'expense', icon: '🍔', color: '#f59e0b' },
  { name: 'Transport', type: 'expense', icon: '🚌', color: '#3b82f6' },
  { name: 'Education', type: 'expense', icon: '📚', color: '#6366f1' },
  { name: 'Entertainment', type: 'expense', icon: '🎮', color: '#ec4899' },
  { name: 'Shopping', type: 'expense', icon: '🛍️', color: '#8b5cf6' },
  { name: 'Bills', type: 'expense', icon: '⚡', color: '#ef4444' },
  { name: 'Other', type: 'expense', icon: '✨', color: '#64748b' },
  { name: 'Allowance', type: 'income', icon: '💰', color: '#10b981' },
  { name: 'Pocket Money', type: 'income', icon: '💰', color: '#10b981' },
  { name: 'Parents', type: 'income', icon: '👨‍👩‍👧', color: '#059669' },
  { name: 'Gift', type: 'income', icon: '🎁', color: '#f43f5e' },
  { name: 'Scholarship', type: 'income', icon: '🎓', color: '#0284c7' },
  { name: 'Other', type: 'income', icon: '✨', color: '#64748b' }
];

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    process.env.JWT_SECRET || 'pocketfriend_secure_jwt_secret_key_2026_change_in_production',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// POST /api/auth/register
async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Please provide your full name.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email.trim())) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    // Check if email already exists
    const [existing] = await pool.execute('SELECT id FROM users WHERE email = ?', [cleanEmail]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists. Please log in.' });
    }

    // Hash password with bcrypt
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insert user into MySQL
    const [result] = await pool.execute(
      'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
      [cleanName, cleanEmail, passwordHash]
    );

    const newUserId = result.insertId;

    // Seed default categories for new user
    for (const cat of DEFAULT_CATEGORIES) {
      await pool.execute(
        'INSERT IGNORE INTO categories (user_id, name, type, icon, color, is_default) VALUES (?, ?, ?, ?, ?, 1)',
        [newUserId, cat.name, cat.type, cat.icon, cat.color]
      );
    }

    const user = {
      id: newUserId,
      name: cleanName,
      email: cleanEmail,
      currency: 'INR',
      theme: 'dark'
    };

    const token = generateToken(user);

    return res.status(201).json({
      success: true,
      message: `Welcome to Pocket Friend, ${cleanName}! 🎉`,
      token,
      user
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/login
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please enter both email and password.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Find user by email
    const [users] = await pool.execute(
      'SELECT id, name, email, password_hash, currency, theme, created_at FROM users WHERE email = ?',
      [cleanEmail]
    );

    if (users.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password. Please try again.' });
    }

    const user = users[0];

    // Verify bcrypt password hash
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password. Please try again.' });
    }

    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      currency: user.currency || 'INR',
      theme: user.theme || 'dark',
      createdAt: user.created_at
    };

    const token = generateToken(userData);

    return res.json({
      success: true,
      message: `Welcome back, ${user.name}! 👋`,
      token,
      user: userData
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/auth/me
async function getMe(req, res, next) {
  try {
    const [users] = await pool.execute(
      'SELECT id, name, email, currency, theme, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'User account not found.' });
    }

    return res.json({
      success: true,
      user: users[0]
    });
  } catch (err) {
    next(err);
  }
}

// PUT /api/auth/profile
async function updateProfile(req, res, next) {
  try {
    const { name, currency, theme } = req.body;
    const userId = req.user.id;

    const updates = [];
    const params = [];

    if (name && name.trim()) {
      updates.push('name = ?');
      params.push(name.trim());
    }

    if (currency) {
      updates.push('currency = ?');
      params.push(currency.trim());
    }

    if (theme) {
      updates.push('theme = ?');
      params.push(theme.trim());
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid update fields provided.' });
    }

    params.push(userId);
    await pool.execute(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);

    const [updatedUsers] = await pool.execute(
      'SELECT id, name, email, currency, theme, created_at FROM users WHERE id = ?',
      [userId]
    );

    return res.json({
      success: true,
      message: 'Profile updated successfully! ✨',
      user: updatedUsers[0]
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  register,
  login,
  getMe,
  updateProfile
};
