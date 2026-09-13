/**
 * Pocket Friend Backend - Centralized Error Handler Middleware
 */

function errorHandler(err, req, res, next) {
  console.error('[API Error]:', err.stack || err.message || err);

  const statusCode = err.statusCode || (res.statusCode >= 400 ? res.statusCode : 500);

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal server error occurred.',
    errors: err.errors || null,
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
  });
}

module.exports = errorHandler;
