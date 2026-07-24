const axios = require('axios');
const config = require('../config/config');
const logger = require('../utils/logger');

class OptimaPayService {
  constructor() {
    this.baseURL = config.api.baseUrl;
    this.apiKey = config.api.key;
    this.apiSecret = config.api.secret;
    this.paymentAccountId = config.api.paymentAccountId;
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'X-API-Key': this.apiKey,
        'X-API-Secret': this.apiSecret,
        'Content-Type': 'application/json'
      }
    });

    // Response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        logger.debug(`OptimaPay API Response: ${response.status}`, {
          url: response.config.url,
          data: response.data
        });
        return response;
      },
      (error) => {
        logger.error('OptimaPay API Error:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Initiate a single STK Push payment request
   */
  async initiateSTKPush(phoneNumber, amount, reference = null, description = null) {
    try {
      const data = {
        payment_account_id: this.paymentAccountId,
        phone: phoneNumber, // Keeps backend compatibility mapping with OptimaPay
        amount: amount,
        reference: reference || `STK_${Date.now()}`,
        description: description || 'Single payment'
      };

      logger.info(`Initiating Single STK Push for ${phoneNumber}`, { amount, reference });

      const response = await this.client.post('/stkpush.php', data);
      
      return {
        success: response.data.success || false,
        message: response.data.message || 'No message received',
        checkout_request_id: response.data.checkout_request_id || null,
        merchant_request_id: response.data.merchant_request_id || null,
        raw: response.data
      };
    } catch (error) {
      logger.error(`STK Push failed for ${phoneNumber}:`, error.message);
      
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Unknown error',
        checkout_request_id: null,
        merchant_request_id: null,
        raw: error.response?.data || null
      };
    }
  }

  /**
   * Check single transaction verification status
   */
  async checkTransactionStatus(checkoutRequestId) {
    try {
      const response = await this.client.get('/status.php', {
        params: { checkout_request_id: checkoutRequestId }
      });

      return {
        success: response.data.success || false,
        status: response.data.status || 'unknown',
        message: response.data.message || 'No message received',
        data: response.data
      };
    } catch (error) {
      logger.error(`Status check failed for ${checkoutRequestId}:`, error.message);
      return {
        success: false,
        status: 'error',
        message: error.response?.data?.message || error.message || 'Unknown error',
        data: error.response?.data || null
      };
    }
  }

  /**
   * Get list of historical transactions
   */
  async getTransactions(limit = 20, offset = 0, startDate = null, endDate = null) {
    try {
      const params = { limit, offset };
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const response = await this.client.get('/transactions.php', { params });
      
      return {
        success: response.data.success || false,
        message: response.data.message || 'No message received',
        transactions: response.data.transactions || [],
        pagination: response.data.pagination || null
      };
    } catch (error) {
      logger.error('Failed to fetch transactions from vendor:', error.message);
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Unknown error',
        transactions: []
      };
    }
  }
}

// Singleton instance
const optimaPayService = new OptimaPayService();
module.exports = optimaPayService;
