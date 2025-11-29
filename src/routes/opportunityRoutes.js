const express = require('express');
const router = express.Router();
const opportunityController = require('../controllers/opportunityController');

// Value help endpoint
router.get('/value-help', opportunityController.getValueHelp);

// SAP CRM endpoints
router.get('/crm/test', opportunityController.testCrmConnection);
router.get('/crm/fetch', opportunityController.fetchFromCRM);
router.get('/crm/fetch/:id', opportunityController.fetchOpportunityFromCRM);
router.post('/crm/sync', opportunityController.refreshFromCRM);

// Legacy refresh endpoint (alias for sync)
router.post('/refresh', opportunityController.refreshFromCRM);

// CRUD routes
router.get('/', opportunityController.getAllOpportunities);
router.get('/:id', opportunityController.getOpportunityById);
router.get('/:id/risks', opportunityController.getOpportunityRisks);
router.post('/', opportunityController.createOpportunity);
router.put('/:id', opportunityController.updateOpportunity);
router.patch('/:id', opportunityController.updateOpportunity);
router.delete('/:id', opportunityController.deleteOpportunity);

module.exports = router;
