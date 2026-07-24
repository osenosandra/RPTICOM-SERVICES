const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const paymentRoutes = require('./routes/paymentRoutes'); 

const app = express();

// Global Request Middlewares
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static assets from public/ directory
app.use(express.static('public')); 

// API routing mount point
app.use('/api/payments', paymentRoutes);

// General Exception Handler Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// CRITICAL EXPORT: Allows server.js to run app.listen()
module.exports = app;
