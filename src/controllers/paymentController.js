const Joi = require('joi');
const optimaPayService = require('../services/optimaPayService');
const transactionModel = require('../models/transactionModel');
const logger = require('../utils/logger');
const config = require('../config/config');

// 1. Define the validation schemas DIRECTLY here so they never fail to load
const phoneRegex = /^(2541|2547)[0-9]{8}$/;

const singlePaymentSchema = Joi.object({
  phoneNumber: Joi.string()
    .pattern(phoneRegex)
    .required()
    .messages({
      'string.empty': 'Phone number is required',
      'string.pattern.base': 'Phone number must be a valid format (e.g., 254712345678)'
    }),
  amount: Joi.number().min(1).max(1000000).required(),
  reference: Joi.string().max(50).allow('', null),
  description: Joi.string().max(200).allow('', null)
});

const statusCheckSchema = Joi.object({
  checkoutRequestId: Joi.string().required()
});

class PaymentController {
  /**
   * Process a single STK Push payment
   */
  async processPayment(req, res, next) {
    try {
      // Validate request body directly using the local schema
      const { error, value } = singlePaymentSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.details.map(d => d.message)
        });
      }

      const { phoneNumber, amount, reference, description } = value;

      // Initiate STK Push
      const result = await optimaPayService.initiateSTKPush(
        phoneNumber,
        amount,
        reference,
        description
      );

      // Store transaction in database
      const transaction = transactionModel.addTransaction({
        phoneNumber,
        amount,
        reference,
        description,
        checkoutRequestId: result.checkout_request_id,
        success: result.success,
        message: result.message
      });

      // Return unified response
      return res.status(200).json({
        success: result.success,
        message: result.message || 'STK Push sent successfully',
        phoneNumber: phoneNumber,
        amount: amount,
        reference: reference,
        checkoutRequestId: result.checkout_request_id,
        transactionId: transaction.id,
        completedAt: new Date().toISOString()
      });

    } catch (error) {
      logger.error('STK Push payment processing error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Internal processing pipeline failure'
      });
    }
  }

  /**
   * Get all transactions (history feed)
   */
  async getTransactions(req, res, next) {
    try {
      const { limit = 20, offset = 0 } = req.query;
      const result = transactionModel.getTransactions(
        parseInt(limit),
        parseInt(offset)
      );

      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Check single transaction status (M-Pesa API Status Check)
   */
  async checkTransactionStatus(req, res, next) {
    try {
      const { error, value } = statusCheckSchema.validate(req.params);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.details.map(d => d.message)
        });
      }

      const { checkoutRequestId } = value;
      
      // Check with OptimaPay API
      const statusResult = await optimaPayService.checkTransactionStatus(checkoutRequestId);
      
      // Update local record
      if (statusResult.success) {
        transactionModel.updateTransactionStatus(checkoutRequestId, statusResult);
      }

      return res.status(200).json({
        success: statusResult.success,
        status: statusResult.status,
        message: statusResult.message,
        data: statusResult.data
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Get transaction details
   */
  async getTransaction(req, res, next) {
    try {
      const { transactionId } = req.params;
      const transaction = transactionModel.getTransaction(transactionId);

      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: 'Transaction not found'
        });
      }

      return res.status(200).json({
        success: true,
        data: transaction
      });
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new PaymentController();
