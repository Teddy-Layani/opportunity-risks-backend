const express = require('express');
const router = express.Router();
const riskController = require('../controllers/riskController');

// Value help endpoint
router.get('/value-help', riskController.getValueHelp);

// Statistics endpoint
router.get('/stats', riskController.getRiskStats);

// Custom actions
router.post('/by-opportunity', riskController.getRisksByOpportunity);
router.post('/for-opportunity', riskController.createRiskForOpportunity);

// CRUD routes
router.get('/', riskController.getAllRisks);
router.get('/:id', riskController.getRiskById);
router.post('/', riskController.createRisk);
router.put('/:id', riskController.updateRisk);
router.patch('/:id', riskController.updateRisk);
router.delete('/:id', riskController.deleteRisk);

module.exports = router;
