/**
 * Pocket Friend Backend - Dashboard Controller
 * Real-Time SQL Aggregations for Financial Metrics & Charts
 */

const { pool } = require('../config/db');

// GET /api/dashboard/summary
async function getSummary(req, res, next) {
  try {
    const userId = req.user.id;

    // 1. Calculate Total Income, Total Expenses, and Net Balance
    const [totals] = await pool.execute(
      `SELECT 
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS totalIncome,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS totalExpenses,
        COUNT(*) AS totalTransactions
      FROM transactions 
      WHERE user_id = ?`,
      [userId]
    );

    const totalIncome = Number(totals[0].totalIncome);
    const totalExpenses = Number(totals[0].totalExpenses);
    const balance = totalIncome - totalExpenses;
    const totalTransactions = Number(totals[0].totalTransactions);

    // 2. Fetch Recent Transactions (Top 6)
    const [recent] = await pool.execute(
      `SELECT 
        id, 
        category_name AS category, 
        type, 
        amount, 
        description, 
        payment_method AS paymentMethod, 
        DATE_FORMAT(transaction_date, '%Y-%m-%d') AS date, 
        created_at AS createdAt 
      FROM transactions 
      WHERE user_id = ? 
      ORDER BY transaction_date DESC, id DESC 
      LIMIT 6`,
      [userId]
    );

    const formattedRecent = recent.map(t => ({
      ...t,
      amount: Number(t.amount)
    }));

    // 3. Category-wise Spending for the Current Month (for Donut Chart)
    const currentMonth = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
    const [categoryExpenses] = await pool.execute(
      `SELECT 
        category_name AS category, 
        SUM(amount) AS totalAmount 
      FROM transactions 
      WHERE user_id = ? 
        AND type = 'expense' 
        AND DATE_FORMAT(transaction_date, '%Y-%m') = ? 
      GROUP BY category_name 
      ORDER BY totalAmount DESC`,
      [userId, currentMonth]
    );

    const categoryBreakdown = categoryExpenses.map(c => ({
      category: c.category,
      amount: Number(c.totalAmount)
    }));

    return res.json({
      success: true,
      data: {
        totalIncome,
        totalExpenses,
        balance,
        savings: balance,
        totalTransactions,
        recentTransactions: formattedRecent,
        categorySpending: categoryBreakdown
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getSummary
};
