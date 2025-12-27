const rateLimit = require('express-rate-limit');


const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 1000, 
  message: {
    error: 'Too many authentication attempts, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
});


const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 1000, 
  message: {
    error: 'Too many requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const strictRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, 
  max: 15, 
  message: {
    error: 'Too many requests for this operation, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  authRateLimit,
  apiRateLimit,
  strictRateLimit
};
