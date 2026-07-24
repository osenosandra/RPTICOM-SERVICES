const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { phoneRateLimiter } = require('../middlewares/rateLimiter');

// 1. Single STK Push payment request route
router.post('/request', 
  phoneRateLimiter,
  (req, res, next) => paymentController.processPayment(req, res, next)
);

// 2. Get transaction history feed (recent single payments)
router.get('/transactions', 
  (req, res, next) => paymentController.getTransactions(req, res, next)
);

// 3. Check explicit transaction status with M-Pesa API
router.get('/status/:checkoutRequestId', 
  (req, res, next) => paymentController.checkTransactionStatus(req, res, next)
);

// 4. Get local transaction record details
router.get('/transaction/:transactionId', 
  (req, res, next) => paymentController.getTransaction(req, res, next)
);

module.exports = router;
