const Opportunity = require('../models/Opportunity');
const Risk = require('../models/Risk');
const Competitor = require('../models/Competitor');
const sapCrmService = require('../services/sapCrmService');

// Get all opportunities
exports.getAllOpportunities = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sort = '-createdAt',
      salesStage,
      search,
      source
    } = req.query;

    // Build filter
    const filter = {};
    if (salesStage) {
      filter.salesStage = salesStage;
    }
    if (source) {
      filter.source = source;
    }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { opportunityID: { $regex: search, $options: 'i' } }
      ];
    }

    const opportunities = await Opportunity.find(filter)
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await Opportunity.countDocuments(filter);

    res.json({
      status: 'success',
      data: {
        opportunities,
        totalPages: Math.ceil(count / limit),
        currentPage: parseInt(page),
        total: count
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Get opportunity by ID (auto-syncs from SAP CRM if not found)
exports.getOpportunityById = async (req, res) => {
  try {
    const { id } = req.params;

    // First try to find by MongoDB _id
    let opportunity = await Opportunity.findById(id).catch(() => null);

    // If not found by _id, try by objectID or opportunityID
    if (!opportunity) {
      opportunity = await Opportunity.findOne({
        $or: [
          { objectID: id },
          { opportunityID: id }
        ]
      });
    }

    // If still not found, try to fetch from SAP CRM and save
    if (!opportunity) {
      console.log(`[API] Opportunity ${id} not in MongoDB, fetching from SAP CRM...`);

      const sapOpportunity = await sapCrmService.fetchOpportunityById(id);

      if (sapOpportunity) {
        // Save to MongoDB
        const newOpp = new Opportunity({
          ...sapOpportunity,
          source: 'sap_crm'
        });
        opportunity = await newOpp.save();
        console.log(`[API] Synced opportunity ${id} from SAP CRM to MongoDB`);
      }
    }

    if (!opportunity) {
      return res.status(404).json({
        status: 'error',
        message: 'Opportunity not found in MongoDB or SAP CRM'
      });
    }

    res.json({
      status: 'success',
      data: { opportunity }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Create opportunity (for manual entry)
exports.createOpportunity = async (req, res) => {
  try {
    const opportunity = new Opportunity({
      ...req.body,
      source: 'manual'
    });
    await opportunity.save();

    res.status(201).json({
      status: 'success',
      data: { opportunity }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        status: 'error',
        message: 'Opportunity ID already exists'
      });
    }
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Update opportunity
exports.updateOpportunity = async (req, res) => {
  try {
    const opportunity = await Opportunity.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!opportunity) {
      return res.status(404).json({
        status: 'error',
        message: 'Opportunity not found'
      });
    }

    res.json({
      status: 'success',
      data: { opportunity }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Delete opportunity (with cascade option for risks)
exports.deleteOpportunity = async (req, res) => {
  try {
    const { cascade } = req.query;

    const opportunity = await Opportunity.findById(req.params.id);

    if (!opportunity) {
      return res.status(404).json({
        status: 'error',
        message: 'Opportunity not found'
      });
    }

    // Check for associated risks
    const riskCount = await Risk.countDocuments({ opportunityID: opportunity.opportunityID });

    if (riskCount > 0 && cascade !== 'true') {
      return res.status(400).json({
        status: 'error',
        message: `Cannot delete opportunity with ${riskCount} associated risks. Use ?cascade=true to delete risks as well.`
      });
    }

    // Delete associated risks if cascade is true
    if (cascade === 'true') {
      await Risk.deleteMany({ opportunityID: opportunity.opportunityID });
    }

    await Opportunity.findByIdAndDelete(req.params.id);

    res.json({
      status: 'success',
      message: 'Opportunity deleted successfully',
      risksDeleted: cascade === 'true' ? riskCount : 0
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Get risks for a specific opportunity (auto-syncs from SAP CRM if not found)
exports.getOpportunityRisks = async (req, res) => {
  try {
    const { id } = req.params;

    // First try to find by MongoDB _id
    let opportunity = await Opportunity.findById(id).catch(() => null);

    // If not found by _id, try by objectID or opportunityID
    if (!opportunity) {
      opportunity = await Opportunity.findOne({
        $or: [
          { objectID: id },
          { opportunityID: id }
        ]
      });
    }

    // If still not found, try to fetch from SAP CRM and save
    if (!opportunity) {
      console.log(`[API] Opportunity ${id} not in MongoDB, fetching from SAP CRM...`);

      const sapOpportunity = await sapCrmService.fetchOpportunityById(id);

      if (sapOpportunity) {
        const newOpp = new Opportunity({
          ...sapOpportunity,
          source: 'sap_crm'
        });
        opportunity = await newOpp.save();
        console.log(`[API] Synced opportunity ${id} from SAP CRM to MongoDB`);
      }
    }

    if (!opportunity) {
      return res.status(404).json({
        status: 'error',
        message: 'Opportunity not found in MongoDB or SAP CRM'
      });
    }

    const risks = await Risk.find({ opportunityID: opportunity.opportunityID })
      .sort('-createdAt');

    res.json({
      status: 'success',
      data: {
        opportunity,
        risks,
        riskCount: risks.length
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Get competitors for a specific opportunity (auto-syncs from SAP CRM if not found)
exports.getOpportunityCompetitors = async (req, res) => {
  try {
    const { id } = req.params;

    // First try to find by MongoDB _id
    let opportunity = await Opportunity.findById(id).catch(() => null);

    // If not found by _id, try by objectID or opportunityID
    if (!opportunity) {
      opportunity = await Opportunity.findOne({
        $or: [
          { objectID: id },
          { opportunityID: id }
        ]
      });
    }

    // If still not found, try to fetch from SAP CRM and save
    if (!opportunity) {
      console.log(`[API] Opportunity ${id} not in MongoDB, fetching from SAP CRM...`);

      const sapOpportunity = await sapCrmService.fetchOpportunityById(id);

      if (sapOpportunity) {
        const newOpp = new Opportunity({
          ...sapOpportunity,
          source: 'sap_crm'
        });
        opportunity = await newOpp.save();
        console.log(`[API] Synced opportunity ${id} from SAP CRM to MongoDB`);
      }
    }

    if (!opportunity) {
      return res.status(404).json({
        status: 'error',
        message: 'Opportunity not found in MongoDB or SAP CRM'
      });
    }

    const competitors = await Competitor.find({ opportunityID: opportunity.opportunityID })
      .sort('-createdAt');

    res.json({
      status: 'success',
      data: {
        opportunity,
        competitors,
        competitorCount: competitors.length
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Test SAP CRM connection
exports.testCrmConnection = async (req, res) => {
  try {
    const result = await sapCrmService.testConnection();

    if (result.success) {
      res.json({
        status: 'success',
        message: 'SAP CRM connection successful',
        data: result
      });
    } else {
      res.status(502).json({
        status: 'error',
        message: 'SAP CRM connection failed',
        data: result
      });
    }
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Fetch opportunities directly from SAP CRM (without saving)
exports.fetchFromCRM = async (req, res) => {
  try {
    const { top = 30, skip = 0 } = req.query;

    const opportunities = await sapCrmService.fetchAllOpportunities({ top, skip });

    res.json({
      status: 'success',
      message: `Fetched ${opportunities.length} opportunities from SAP CRM`,
      data: {
        opportunities,
        count: opportunities.length,
        source: 'sap_crm'
      }
    });
  } catch (error) {
    res.status(502).json({
      status: 'error',
      message: `Failed to fetch from SAP CRM: ${error.message}`
    });
  }
};

// Sync opportunities from SAP CRM to MongoDB
exports.refreshFromCRM = async (req, res) => {
  try {
    const { top = 100, skip = 0 } = req.query;

    console.log('[Sync] Starting SAP CRM sync...');

    // Fetch opportunities from SAP CRM
    const sapOpportunities = await sapCrmService.fetchAllOpportunities({ top, skip });

    console.log(`[Sync] Fetched ${sapOpportunities.length} opportunities from SAP CRM`);

    let created = 0;
    let updated = 0;
    let errors = [];

    // Upsert each opportunity
    for (const sapOpp of sapOpportunities) {
      try {
        const existingOpp = await Opportunity.findOne({ opportunityID: sapOpp.opportunityID });

        if (existingOpp) {
          // Update existing opportunity
          await Opportunity.findByIdAndUpdate(existingOpp._id, {
            ...sapOpp,
            source: 'sap_crm'
          });
          updated++;
        } else {
          // Create new opportunity
          const newOpp = new Opportunity({
            ...sapOpp,
            source: 'sap_crm'
          });
          await newOpp.save();
          created++;
        }
      } catch (err) {
        console.error(`[Sync] Error syncing opportunity ${sapOpp.opportunityID}:`, err.message);
        errors.push({ opportunityID: sapOpp.opportunityID, error: err.message });
      }
    }

    console.log(`[Sync] Completed: ${created} created, ${updated} updated, ${errors.length} errors`);

    res.json({
      status: 'success',
      message: `SAP CRM sync completed`,
      data: {
        fetched: sapOpportunities.length,
        created,
        updated,
        errors: errors.length,
        errorDetails: errors.length > 0 ? errors : undefined,
        source: 'sap_crm'
      }
    });
  } catch (error) {
    console.error('[Sync] SAP CRM sync failed:', error.message);
    res.status(502).json({
      status: 'error',
      message: `Failed to sync from SAP CRM: ${error.message}`
    });
  }
};

// Fetch a specific opportunity from SAP CRM by ID
exports.fetchOpportunityFromCRM = async (req, res) => {
  try {
    const { id } = req.params;

    const opportunity = await sapCrmService.fetchOpportunityById(id);

    if (!opportunity) {
      return res.status(404).json({
        status: 'error',
        message: `Opportunity ${id} not found in SAP CRM`
      });
    }

    res.json({
      status: 'success',
      data: {
        opportunity,
        source: 'sap_crm'
      }
    });
  } catch (error) {
    res.status(502).json({
      status: 'error',
      message: `Failed to fetch from SAP CRM: ${error.message}`
    });
  }
};

// Get value help data (static lookups)
exports.getValueHelp = async (req, res) => {
  try {
    const valueHelp = {
      salesStages: [
        { code: 'Qualified', text: 'Qualified' },
        { code: 'Proposal', text: 'Proposal' },
        { code: 'Negotiation', text: 'Negotiation' },
        { code: 'Won', text: 'Won' },
        { code: 'Lost', text: 'Lost' }
      ],
      currencies: [
        { code: 'USD', text: 'US Dollar' },
        { code: 'EUR', text: 'Euro' },
        { code: 'GBP', text: 'British Pound' },
        { code: 'ILS', text: 'Israeli Shekel' }
      ],
      sources: [
        { code: 'manual', text: 'Manual Entry' },
        { code: 'sap_crm', text: 'SAP CRM' }
      ]
    };

    res.json({
      status: 'success',
      data: valueHelp
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};
