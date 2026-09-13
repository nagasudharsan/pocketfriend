-- ============================================================================
-- Pocket Friend - MySQL Database Schema
-- Database: pocket_friend
-- Production-Ready Schema with Foreign Keys, Constraints, and Indexes
-- ============================================================================

-- Create Database if it does not exist
CREATE DATABASE IF NOT EXISTS `pocket_friend`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE `pocket_friend`;

-- ----------------------------------------------------------------------------
-- 1. Table: users
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `currency` VARCHAR(10) DEFAULT 'INR',
  `theme` VARCHAR(20) DEFAULT 'dark',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_users_email` (`email`),
  INDEX `idx_users_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 2. Table: categories
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `categories` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `type` ENUM('expense', 'income') NOT NULL DEFAULT 'expense',
  `icon` VARCHAR(50) DEFAULT '🏷️',
  `color` VARCHAR(20) DEFAULT '#8b5cf6',
  `is_default` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_categories_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  UNIQUE KEY `uq_user_category_type` (`user_id`, `name`, `type`),
  INDEX `idx_categories_user` (`user_id`),
  INDEX `idx_categories_type` (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 3. Table: transactions
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `transactions` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL,
  `category_id` INT UNSIGNED NULL,
  `category_name` VARCHAR(100) NOT NULL,
  `type` ENUM('income', 'expense') NOT NULL,
  `amount` DECIMAL(12, 2) NOT NULL,
  `description` VARCHAR(255) NOT NULL,
  `payment_method` VARCHAR(50) NOT NULL DEFAULT 'UPI',
  `transaction_date` DATE NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_transactions_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_transactions_category`
    FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  INDEX `idx_transactions_user_date` (`user_id`, `transaction_date` DESC),
  INDEX `idx_transactions_user_type` (`user_id`, `type`),
  INDEX `idx_transactions_category` (`category_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
