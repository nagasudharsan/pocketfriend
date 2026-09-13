/**
 * Pocket Friend Backend - Transaction Routes
 */

const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const authMiddleware = require('../middleware/authMiddleware');

// All transaction routes require JWT authentication
router.use(authMiddleware);

router.get('/', transactionController.getTransactions);
router.post('/', transactionController.createTransaction);
router.get('/:id', transactionController.getTransactionById);
router.put('/:id', transactionController.updateTransaction);
router.delete('/:id', transactionController.deleteTransaction);

module.exports = router;
