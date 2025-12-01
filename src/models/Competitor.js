const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const competitorSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: () => uuidv4()
  },
  name: {
    type: String,
    required: [true, 'Competitor name is required'],
    maxLength: [200, 'Name cannot exceed 200 characters'],
    trim: true
  },
  strengths: {
    type: String,
    maxLength: [1000, 'Strengths cannot exceed 1000 characters'],
    trim: true
  },
  weaknesses: {
    type: String,
    maxLength: [1000, 'Weaknesses cannot exceed 1000 characters'],
    trim: true
  },
  threatLevel: {
    type: String,
    enum: {
      values: ['Low', 'Medium', 'High'],
      message: 'Threat level must be one of: Low, Medium, High'
    },
    default: 'Medium'
  },
  status: {
    type: String,
    enum: {
      values: ['Active', 'Inactive', 'Won', 'Lost'],
      message: 'Status must be one of: Active, Inactive, Won, Lost'
    },
    default: 'Active'
  },
  strategy: {
    type: String,
    maxLength: [1000, 'Strategy cannot exceed 1000 characters'],
    trim: true
  },
  pricePosition: {
    type: String,
    enum: {
      values: ['Lower', 'Similar', 'Higher', 'Unknown'],
      message: 'Price position must be one of: Lower, Similar, Higher, Unknown'
    },
    default: 'Unknown'
  },
  winProbability: {
    type: Number,
    min: [0, 'Win probability cannot be less than 0'],
    max: [100, 'Win probability cannot exceed 100']
  },
  notes: {
    type: String,
    maxLength: [2000, 'Notes cannot exceed 2000 characters'],
    trim: true
  },
  opportunityID: {
    type: String,
    required: [true, 'Opportunity ID is required'],
    index: true
  },
  opportunityName: {
    type: String,
    maxLength: 200
  }
}, {
  timestamps: true,
  _id: false // We're using custom _id
});

// Indexes
competitorSchema.index({ opportunityID: 1, status: 1 });
competitorSchema.index({ threatLevel: 1 });
competitorSchema.index({ name: 1 });

// Virtual for threat score
competitorSchema.virtual('threatScore').get(function() {
  const threatMap = { 'Low': 1, 'Medium': 2, 'High': 3 };
  return threatMap[this.threatLevel] || 0;
});

// Ensure virtuals are included in JSON output
competitorSchema.set('toJSON', { virtuals: true });
competitorSchema.set('toObject', { virtuals: true });

// Instance method to clean output
competitorSchema.methods.toJSON = function() {
  const competitor = this.toObject({ virtuals: true });
  delete competitor.__v;
  return competitor;
};

const Competitor = mongoose.model('Competitor', competitorSchema);

module.exports = Competitor;
