require('dotenv').config();

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  webhookSecret: process.env.WEBHOOK_SECRET || 'whsec_checkout_demo_secret_2026',
  taxRateDefault: parseFloat(process.env.DEFAULT_TAX_RATE || '0.08'),
  defaultCurrency: process.env.DEFAULT_CURRENCY || 'USD'
};

module.exports = config;
