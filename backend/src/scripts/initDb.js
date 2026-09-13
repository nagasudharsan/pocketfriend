/**
 * Pocket Friend - Database Initialization & Verification Script
 * Creates `pocket_friend` database and all required tables: users, categories, transactions.
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'pocket_friend';
const DB_PORT = parseInt(process.env.DB_PORT, 10) || 3306;

async function initializeDatabase() {
  console.log('========================================================');
  console.log('📦 Pocket Friend - MySQL Database Initializer');
  console.log('========================================================');
  console.log(`Connecting to MySQL Server at ${DB_HOST}:${DB_PORT} with user "${DB_USER}"...`);

  let connection;
  try {
    // 1. Connect to MySQL server without selecting database first
    connection = await mysql.createConnection({
      host: DB_HOST,
      user: DB_USER,
      password: DB_PASSWORD,
      port: DB_PORT,
      multipleStatements: true
    });

    console.log('✅ Connected to MySQL server successfully!');

    // 2. Create database if not exists
    console.log(`Creating database \`${DB_NAME}\` if not exists...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    console.log(`✅ Database \`${DB_NAME}\` is ready.`);

    // 3. Switch to database
    await connection.query(`USE \`${DB_NAME}\`;`);

    // 4. Create Tables
    console.log('Creating tables: users, categories, transactions...');

    const schemaPath = path.join(__dirname, '../../../database/schema.sql');
    let schemaSQL = '';
    if (fs.existsSync(schemaPath)) {
      schemaSQL = fs.readFileSync(schemaPath, 'utf8');
      await connection.query(schemaSQL);
      console.log('✅ Executed schema.sql successfully!');
    } else {
      // Fallback SQL definition
      await connection.query(`
        CREATE TABLE IF NOT EXISTS \`users\` (
          \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          \`name\` VARCHAR(100) NOT NULL,
          \`email\` VARCHAR(255) NOT NULL,
          \`password_hash\` VARCHAR(255) NOT NULL,
          \`currency\` VARCHAR(10) DEFAULT 'INR',
          \`theme\` VARCHAR(20) DEFAULT 'dark',
          \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY \`uq_users_email\` (\`email\`),
          INDEX \`idx_users_created_at\` (\`created_at\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS \`categories\` (
          \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          \`user_id\` INT UNSIGNED NOT NULL,
          \`name\` VARCHAR(100) NOT NULL,
          \`type\` ENUM('expense', 'income') NOT NULL DEFAULT 'expense',
          \`icon\` VARCHAR(50) DEFAULT '🏷️',
          \`color\` VARCHAR(20) DEFAULT '#8b5cf6',
          \`is_default\` TINYINT(1) NOT NULL DEFAULT 0,
          \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT \`fk_categories_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
          UNIQUE KEY \`uq_user_category_type\` (\`user_id\`, \`name\`, \`type\`),
          INDEX \`idx_categories_user\` (\`user_id\`),
          INDEX \`idx_categories_type\` (\`type\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS \`transactions\` (
          \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          \`user_id\` INT UNSIGNED NOT NULL,
          \`category_id\` INT UNSIGNED NULL,
          \`category_name\` VARCHAR(100) NOT NULL,
          \`type\` ENUM('income', 'expense') NOT NULL,
          \`amount\` DECIMAL(12, 2) NOT NULL,
          \`description\` VARCHAR(255) NOT NULL,
          \`payment_method\` VARCHAR(50) NOT NULL DEFAULT 'UPI',
          \`transaction_date\` DATE NOT NULL,
          \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT \`fk_transactions_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT \`fk_transactions_category\` FOREIGN KEY (\`category_id\`) REFERENCES \`categories\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE,
          INDEX \`idx_transactions_user_date\` (\`user_id\`, \`transaction_date\` DESC),
          INDEX \`idx_transactions_user_type\` (\`user_id\`, \`type\`),
          INDEX \`idx_transactions_category\` (\`category_id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
      console.log('✅ Tables created successfully!');
    }

    // 5. Verify tables
    const [tables] = await connection.query(`SHOW TABLES;`);
    console.log('📋 Existing tables in pocket_friend:');
    console.table(tables);

    console.log('🎉 Database setup completed successfully!');
    await connection.end();
    return true;
  } catch (err) {
    console.error('\n❌ Database initialization error:', err.message);
    if (err.code === 'ECONNREFUSED') {
      console.error('\n⚠️  Could not connect to MySQL server at ' + DB_HOST + ':' + DB_PORT);
      console.error('Please ensure MySQL service (or XAMPP/WAMP/MariaDB) is started.');
    }
    if (connection) await connection.end();
    return false;
  }
}

if (require.main === module) {
  initializeDatabase();
}

module.exports = initializeDatabase;
