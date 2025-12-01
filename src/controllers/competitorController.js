const Competitor = require('../models/Competitor');
const Opportunity = require('../models/Opportunity');

// Get all competitors
exports.getAllCompetitors = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sort = '-createdAt',
      threatLevel,
      status,
      opportunityID
    } = req.query;

    // Build filter
    const filter = {};
    if (threatLevel) {
      filter.threatLevel = threatLevel;
    }
    if (status) {
      filter.status = status;
    }
    if (opportunityID) {
      filter.opportunityID = opportunityID;
    }

    const competitors = await Competitor.find(filter)
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await Competitor.countDocuments(filter);

    res.json({
      status: 'success',
      data: {
        competitors,
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

// Get competitor by ID
exports.getCompetitorById = async (req, res) => {
  try {
    const competitor = await Competitor.findById(req.params.id);

    if (!competitor) {
      return res.status(404).json({
        status: 'error',
        message: 'Competitor not found'
      });
    }

    res.json({
      status: 'success',
      data: { competitor }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Get competitors by opportunity ID
exports.getCompetitorsByOpportunity = async (req, res) => {
  try {
    const { opportunityID } = req.params;

    const competitors = await Competitor.find({ opportunityID })
      .sort('-createdAt');

    res.json({
      status: 'success',
      data: {
        competitors,
        count: competitors.length
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Create competitor
exports.createCompetitor = async (req, res) => {
  try {
    const { opportunityID } = req.body;

    // Validate opportunity exists
    const opportunity = await Opportunity.findOne({
      $or: [
        { _id: opportunityID },
        { objectID: opportunityID },
        { opportunityID: opportunityID }
      ]
    });

    if (!opportunity) {
      return res.status(400).json({
        status: 'error',
        message: 'Opportunity not found'
      });
    }

    const competitor = new Competitor({
      ...req.body,
      opportunityID: opportunity.opportunityID,
      opportunityName: opportunity.name
    });

    await competitor.save();

    res.status(201).json({
      status: 'success',
      data: { competitor }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Update competitor
exports.updateCompetitor = async (req, res) => {
  try {
    const competitor = await Competitor.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!competitor) {
      return res.status(404).json({
        status: 'error',
        message: 'Competitor not found'
      });
    }

    res.json({
      status: 'success',
      data: { competitor }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Delete competitor
exports.deleteCompetitor = async (req, res) => {
  try {
    const competitor = await Competitor.findByIdAndDelete(req.params.id);

    if (!competitor) {
      return res.status(404).json({
        status: 'error',
        message: 'Competitor not found'
      });
    }

    res.json({
      status: 'success',
      message: 'Competitor deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Delete all competitors for an opportunity
exports.deleteCompetitorsByOpportunity = async (req, res) => {
  try {
    const { opportunityID } = req.params;

    const result = await Competitor.deleteMany({ opportunityID });

    res.json({
      status: 'success',
      message: `Deleted ${result.deletedCount} competitors`
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};
