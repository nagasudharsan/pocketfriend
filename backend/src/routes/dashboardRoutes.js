/**
 * Pocket Friend Backend - Dashboard Routes
 */

const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middleware/authMiddleware');

// All dashboard routes require JWT authentication
router.use(authMiddleware);

router.get('/summary', dashboardController.getSummary);

module.exports = router;
