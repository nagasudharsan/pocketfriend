/**
 * Pocket Friend Backend - Categories Controller
 * Category Management (Default & Custom Categories)
 */

const { pool } = require('../config/db');

// GET /api/categories
async function getCategories(req, res, next) {
  try {
    const userId = req.user.id;
    const { type } = req.query;

    let sql = 'SELECT id, name, type, icon, color, is_default AS isDefault, created_at AS createdAt FROM categories WHERE user_id = ?';
    const params = [userId];

    if (type && (type === 'income' || type === 'expense')) {
      sql += ' AND type = ?';
      params.push(type);
    }

    sql += ' ORDER BY is_default DESC, name ASC';

    const [categories] = await pool.query(sql, params);

    return res.json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/categories
async function createCategory(req, res, next) {
  try {
    const userId = req.user.id;
    const { name, type, icon, color } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Category name cannot be empty.' });
    }

    const cleanName = name.trim();
    const categoryType = (type === 'income') ? 'income' : 'expense';
    const categoryIcon = icon || '🏷️';
    const categoryColor = color || '#8b5cf6';

    // Duplicate check for this user
    const [existing] = await pool.execute(
      'SELECT id FROM categories WHERE user_id = ? AND LOWER(name) = LOWER(?) AND type = ?',
      [userId, cleanName, categoryType]
    );

    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: `Category "${cleanName}" already exists for ${categoryType}.` });
    }

    const [result] = await pool.execute(
      'INSERT INTO categories (user_id, name, type, icon, color, is_default) VALUES (?, ?, ?, ?, ?, 0)',
      [userId, cleanName, categoryType, categoryIcon, categoryColor]
    );

    const newCategory = {
      id: result.insertId,
      name: cleanName,
      type: categoryType,
      icon: categoryIcon,
      color: categoryColor,
      isDefault: 0,
      createdAt: new Date().toISOString()
    };

    return res.status(201).json({
      success: true,
      message: `Category "${cleanName}" created successfully! 🎉`,
      data: newCategory
    });
  } catch (err) {
    next(err);
  }
}

// PUT /api/categories/:id
async function updateCategory(req, res, next) {
  try {
    const userId = req.user.id;
    const categoryId = req.params.id;
    const { name, icon, color } = req.body;

    const [existing] = await pool.execute(
      'SELECT id, is_default FROM categories WHERE id = ? AND user_id = ?',
      [categoryId, userId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Category not found or access denied.' });
    }

    const updates = [];
    const params = [];

    if (name && name.trim()) {
      updates.push('name = ?');
      params.push(name.trim());
    }

    if (icon) {
      updates.push('icon = ?');
      params.push(icon.trim());
    }

    if (color) {
      updates.push('color = ?');
      params.push(color.trim());
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields provided for update.' });
    }

    params.push(categoryId, userId);
    await pool.execute(
      `UPDATE categories SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
      params
    );

    const [updated] = await pool.execute(
      'SELECT id, name, type, icon, color, is_default AS isDefault FROM categories WHERE id = ? AND user_id = ?',
      [categoryId, userId]
    );

    return res.json({
      success: true,
      message: 'Category updated successfully.',
      data: updated[0]
    });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/categories/:id
async function deleteCategory(req, res, next) {
  try {
    const userId = req.user.id;
    const categoryId = req.params.id;

    // Check if category exists
    const [existing] = await pool.execute(
      'SELECT id, name FROM categories WHERE id = ? AND user_id = ?',
      [categoryId, userId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Category not found or access denied.' });
    }

    await pool.execute(
      'DELETE FROM categories WHERE id = ? AND user_id = ?',
      [categoryId, userId]
    );

    return res.json({
      success: true,
      message: `Category "${existing[0].name}" deleted successfully.`
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory
};
