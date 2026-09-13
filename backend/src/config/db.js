/**
 * Pocket Friend Backend - MySQL Database Configuration
 * Connection Pool with mysql2/promise
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'pocket_friend',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Test and log connection on boot
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log(`[MySQL Database] Connected successfully to "${process.env.DB_NAME || 'pocket_friend'}" at ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 3306}`);
    connection.release();
    return true;
  } catch (err) {
    console.error('[MySQL Database] Connection Failed:', err.message);
    console.error('[MySQL Database] Please verify MySQL is running and database "pocket_friend" exists.');
    return false;
  }
}

module.exports = {
  pool,
  query: (sql, params) => pool.execute(sql, params),
  testConnection
};
