const Risk = require('../models/Risk');
const Opportunity = require('../models/Opportunity');

// Get all risks
exports.getAllRisks = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sort = '-createdAt',
      opportunityID,
      status,
      impact,
      probability,
      search
    } = req.query;

    // Build filter
    const filter = {};
    if (opportunityID) {
      filter.opportunityID = opportunityID;
    }
    if (status) {
      filter.status = status;
    }
    if (impact) {
      filter.impact = impact;
    }
    if (probability) {
      filter.probability = probability;
    }
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const risks = await Risk.find(filter)
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await Risk.countDocuments(filter);

    res.json({
      status: 'success',
      data: {
        risks,
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

// Get risk by ID
exports.getRiskById = async (req, res) => {
  try {
    const risk = await Risk.findById(req.params.id);

    if (!risk) {
      return res.status(404).json({
        status: 'error',
        message: 'Risk not found'
      });
    }

    res.json({
      status: 'success',
      data: { risk }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Create new risk
exports.createRisk = async (req, res) => {
  try {
    const { opportunityID } = req.body;

    // Validate that opportunity exists and get its name
    const opportunity = await Opportunity.findOne({ opportunityID });
    if (!opportunity) {
      return res.status(400).json({
        status: 'error',
        message: `Opportunity with ID '${opportunityID}' not found`
      });
    }

    const risk = new Risk({
      ...req.body,
      opportunityName: opportunity.name
    });
    await risk.save();

    res.status(201).json({
      status: 'success',
      data: { risk }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Update risk
exports.updateRisk = async (req, res) => {
  try {
    // If opportunityID is being updated, validate and update name
    if (req.body.opportunityID) {
      const opportunity = await Opportunity.findOne({ opportunityID: req.body.opportunityID });
      if (!opportunity) {
        return res.status(400).json({
          status: 'error',
          message: `Opportunity with ID '${req.body.opportunityID}' not found`
        });
      }
      req.body.opportunityName = opportunity.name;
    }

    const risk = await Risk.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!risk) {
      return res.status(404).json({
        status: 'error',
        message: 'Risk not found'
      });
    }

    res.json({
      status: 'success',
      data: { risk }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Delete risk
exports.deleteRisk = async (req, res) => {
  try {
    const risk = await Risk.findByIdAndDelete(req.params.id);

    if (!risk) {
      return res.status(404).json({
        status: 'error',
        message: 'Risk not found'
      });
    }

    res.json({
      status: 'success',
      message: 'Risk deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Custom action: Get risks by opportunity (POST method as specified)
exports.getRisksByOpportunity = async (req, res) => {
  try {
    const { opportunityID } = req.body;

    if (!opportunityID) {
      return res.status(400).json({
        status: 'error',
        message: 'opportunityID is required'
      });
    }

    const risks = await Risk.find({ opportunityID }).sort('-createdAt');

    res.json({
      status: 'success',
      data: {
        opportunityID,
        risks,
        count: risks.length
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Custom action: Create risk for opportunity (POST method with context)
exports.createRiskForOpportunity = async (req, res) => {
  try {
    const { opportunityID, title, description, impact, probability, owner, mitigation, dueDate } = req.body;

    if (!opportunityID) {
      return res.status(400).json({
        status: 'error',
        message: 'opportunityID is required'
      });
    }

    // Find opportunity by opportunityID field
    const opportunity = await Opportunity.findOne({ opportunityID });
    if (!opportunity) {
      return res.status(400).json({
        status: 'error',
        message: `Opportunity with ID '${opportunityID}' not found`
      });
    }

    const risk = new Risk({
      title,
      description,
      impact,
      probability,
      owner,
      mitigation,
      dueDate,
      opportunityID,
      opportunityName: opportunity.name,
      status: 'Open'
    });
    await risk.save();

    res.status(201).json({
      status: 'success',
      data: {
        risk,
        opportunity: {
          id: opportunity._id,
          opportunityID: opportunity.opportunityID,
          name: opportunity.name
        }
      }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Get value help data for risks (static lookups)
exports.getValueHelp = async (req, res) => {
  try {
    const valueHelp = {
      impactLevels: [
        { code: 'Low', text: 'Low Impact' },
        { code: 'Medium', text: 'Medium Impact' },
        { code: 'High', text: 'High Impact' }
      ],
      probabilityLevels: [
        { code: 'Low', text: 'Low Probability' },
        { code: 'Medium', text: 'Medium Probability' },
        { code: 'High', text: 'High Probability' }
      ],
      statusTypes: [
        { code: 'Open', text: 'Open' },
        { code: 'Mitigated', text: 'Mitigated' },
        { code: 'Closed', text: 'Closed' }
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

// Get risk statistics
exports.getRiskStats = async (req, res) => {
  try {
    const { opportunityID } = req.query;

    const filter = opportunityID ? { opportunityID } : {};

    const stats = await Risk.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          open: { $sum: { $cond: [{ $eq: ['$status', 'Open'] }, 1, 0] } },
          mitigated: { $sum: { $cond: [{ $eq: ['$status', 'Mitigated'] }, 1, 0] } },
          closed: { $sum: { $cond: [{ $eq: ['$status', 'Closed'] }, 1, 0] } },
          highImpact: { $sum: { $cond: [{ $eq: ['$impact', 'High'] }, 1, 0] } },
          highProbability: { $sum: { $cond: [{ $eq: ['$probability', 'High'] }, 1, 0] } }
        }
      }
    ]);

    const result = stats[0] || {
      total: 0,
      open: 0,
      mitigated: 0,
      closed: 0,
      highImpact: 0,
      highProbability: 0
    };

    res.json({
      status: 'success',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};
