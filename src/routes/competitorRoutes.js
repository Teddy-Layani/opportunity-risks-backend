const express = require('express');
const router = express.Router();
const competitorController = require('../controllers/competitorController');

// Get competitors by opportunity
router.get('/opportunity/:opportunityID', competitorController.getCompetitorsByOpportunity);

// Delete all competitors for an opportunity
router.delete('/opportunity/:opportunityID', competitorController.deleteCompetitorsByOpportunity);

// CRUD routes
router.get('/', competitorController.getAllCompetitors);
router.get('/:id', competitorController.getCompetitorById);
router.post('/', competitorController.createCompetitor);
router.put('/:id', competitorController.updateCompetitor);
router.patch('/:id', competitorController.updateCompetitor);
router.delete('/:id', competitorController.deleteCompetitor);

module.exports = router;
