const express = require('express');
const router = express.Router();

const opportunityRoutes = require('./opportunityRoutes');
const riskRoutes = require('./riskRoutes');

// Mount routes
router.use('/opportunities', opportunityRoutes);
router.use('/risks', riskRoutes);

// Health check for API
router.get('/health', (req, res) => {
  res.json({
    status: 'success',
    message: 'API is healthy',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
