const app = require('./app');
const config = require('./config');

const server = app.listen(config.port, () => {
  console.log(`[Checkout Service] Server running on port ${config.port} in ${config.env} mode`);
});

// Graceful shutdown
const shutdown = () => {
  console.log('[Checkout Service] Shutting down gracefully...');
  server.close(() => {
    console.log('[Checkout Service] HTTP server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

module.exports = server;
