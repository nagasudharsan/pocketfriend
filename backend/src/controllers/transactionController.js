/**
 * Pocket Friend Backend - Transactions Controller
 * CRUD Operations with Strict User Data Isolation
 */

const { pool } = require('../config/db');

// GET /api/transactions
async function getTransactions(req, res, next) {
  try {
    const userId = req.user.id;
    const { type, category, search, sort, startDate, endDate, limit } = req.query;

    let sql = `
      SELECT 
        id, 
        user_id, 
        category_id, 
        category_name AS category, 
        type, 
        amount, 
        description, 
        payment_method AS paymentMethod, 
        DATE_FORMAT(transaction_date, '%Y-%m-%d') AS date, 
        created_at AS createdAt
      FROM transactions 
      WHERE user_id = ?
    `;
    const params = [userId];

    if (type && (type === 'income' || type === 'expense')) {
      sql += ' AND type = ?';
      params.push(type);
    }

    if (category && category !== 'all') {
      sql += ' AND LOWER(category_name) = LOWER(?)';
      params.push(category);
    }

    if (search && search.trim()) {
      sql += ' AND (LOWER(description) LIKE ? OR LOWER(category_name) LIKE ? OR LOWER(payment_method) LIKE ?)';
      const queryPattern = `%${search.trim().toLowerCase()}%`;
      params.push(queryPattern, queryPattern, queryPattern);
    }

    if (startDate) {
      sql += ' AND transaction_date >= ?';
      params.push(startDate);
    }

    if (endDate) {
      sql += ' AND transaction_date <= ?';
      params.push(endDate);
    }

    // Sort order
    if (sort === 'oldest') {
      sql += ' ORDER BY transaction_date ASC, id ASC';
    } else if (sort === 'highest') {
      sql += ' ORDER BY amount DESC';
    } else if (sort === 'lowest') {
      sql += ' ORDER BY amount ASC';
    } else {
      // Default: newest first
      sql += ' ORDER BY transaction_date DESC, id DESC';
    }

    if (limit && parseInt(limit, 10) > 0) {
      sql += ' LIMIT ?';
      params.push(parseInt(limit, 10));
    }

    const [transactions] = await pool.query(sql, params);

    // Format amount as Number
    const formatted = transactions.map(t => ({
      ...t,
      amount: Number(t.amount)
    }));

    return res.json({
      success: true,
      count: formatted.length,
      data: formatted
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/transactions/:id
async function getTransactionById(req, res, next) {
  try {
    const userId = req.user.id;
    const txId = req.params.id;

    const [rows] = await pool.execute(
      `SELECT 
        id, 
        user_id, 
        category_id, 
        category_name AS category, 
        type, 
        amount, 
        description, 
        payment_method AS paymentMethod, 
        DATE_FORMAT(transaction_date, '%Y-%m-%d') AS date, 
        created_at AS createdAt 
      FROM transactions 
      WHERE id = ? AND user_id = ?`,
      [txId, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Transaction not found or access denied.' });
    }

    const tx = rows[0];
    tx.amount = Number(tx.amount);

    return res.json({
      success: true,
      data: tx
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/transactions
async function createTransaction(req, res, next) {
  try {
    const userId = req.user.id;
    const { type, amount, category, description, date, paymentMethod, categoryId } = req.body;

    if (!type || (type !== 'income' && type !== 'expense')) {
      return res.status(400).json({ success: false, message: 'Transaction type must be "income" or "expense".' });
    }

    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Please provide a valid transaction amount greater than 0.' });
    }

    const categoryName = (category || (type === 'income' ? 'Pocket Money' : 'Food')).trim();
    const desc = (description || `${categoryName} ${type === 'income' ? 'Income' : 'Expense'}`).trim();
    const txDate = date || new Date().toISOString().split('T')[0];
    const method = (paymentMethod || 'UPI').trim();

    // Verify or find category_id if provided or search user categories
    let finalCatId = categoryId || null;
    if (!finalCatId) {
      const [cats] = await pool.execute(
        'SELECT id FROM categories WHERE user_id = ? AND LOWER(name) = LOWER(?) AND type = ? LIMIT 1',
        [userId, categoryName, type]
      );
      if (cats.length > 0) {
        finalCatId = cats[0].id;
      }
    }

    const [result] = await pool.execute(
      `INSERT INTO transactions 
        (user_id, category_id, category_name, type, amount, description, payment_method, transaction_date) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, finalCatId, categoryName, type, parsedAmount, desc, method, txDate]
    );

    const newTxId = result.insertId;

    const newTransaction = {
      id: newTxId,
      userId,
      categoryId: finalCatId,
      category: categoryName,
      type,
      amount: parsedAmount,
      description: desc,
      paymentMethod: method,
      date: txDate,
      createdAt: new Date().toISOString()
    };

    return res.status(201).json({
      success: true,
      message: `${type === 'income' ? 'Income' : 'Expense'} of ₹${parsedAmount} recorded successfully! 🎉`,
      data: newTransaction
    });
  } catch (err) {
    next(err);
  }
}

// PUT /api/transactions/:id
async function updateTransaction(req, res, next) {
  try {
    const userId = req.user.id;
    const txId = req.params.id;
    const { type, amount, category, description, date, paymentMethod, categoryId } = req.body;

    // Verify ownership
    const [existing] = await pool.execute(
      'SELECT id FROM transactions WHERE id = ? AND user_id = ?',
      [txId, userId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Transaction not found or access denied.' });
    }

    const updates = [];
    const params = [];

    if (type && (type === 'income' || type === 'expense')) {
      updates.push('type = ?');
      params.push(type);
    }

    if (amount !== undefined) {
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({ success: false, message: 'Amount must be a positive number.' });
      }
      updates.push('amount = ?');
      params.push(parsedAmount);
    }

    if (category && category.trim()) {
      updates.push('category_name = ?');
      params.push(category.trim());
    }

    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description.trim());
    }

    if (date) {
      updates.push('transaction_date = ?');
      params.push(date);
    }

    if (paymentMethod) {
      updates.push('payment_method = ?');
      params.push(paymentMethod.trim());
    }

    if (categoryId !== undefined) {
      updates.push('category_id = ?');
      params.push(categoryId || null);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields provided for update.' });
    }

    params.push(txId, userId);
    await pool.execute(
      `UPDATE transactions SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
      params
    );

    const [updated] = await pool.execute(
      `SELECT 
        id, 
        user_id, 
        category_id, 
        category_name AS category, 
        type, 
        amount, 
        description, 
        payment_method AS paymentMethod, 
        DATE_FORMAT(transaction_date, '%Y-%m-%d') AS date, 
        created_at AS createdAt,
        updated_at AS updatedAt 
      FROM transactions 
      WHERE id = ? AND user_id = ?`,
      [txId, userId]
    );

    const updatedTx = updated[0];
    updatedTx.amount = Number(updatedTx.amount);

    return res.json({
      success: true,
      message: 'Transaction updated successfully! ✨',
      data: updatedTx
    });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/transactions/:id
async function deleteTransaction(req, res, next) {
  try {
    const userId = req.user.id;
    const txId = req.params.id;

    const [result] = await pool.execute(
      'DELETE FROM transactions WHERE id = ? AND user_id = ?',
      [txId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Transaction not found or access denied.' });
    }

    return res.json({
      success: true,
      message: 'Transaction deleted successfully.'
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction
};
