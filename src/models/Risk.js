const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const riskSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: () => uuidv4()
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    maxLength: [100, 'Title cannot exceed 100 characters'],
    trim: true
  },
  description: {
    type: String,
    maxLength: [500, 'Description cannot exceed 500 characters'],
    trim: true
  },
  impact: {
    type: String,
    enum: {
      values: ['Low', 'Medium', 'High'],
      message: 'Impact must be one of: Low, Medium, High'
    },
    required: [true, 'Impact is required']
  },
  probability: {
    type: String,
    enum: {
      values: ['Low', 'Medium', 'High'],
      message: 'Probability must be one of: Low, Medium, High'
    },
    required: [true, 'Probability is required']
  },
  status: {
    type: String,
    enum: {
      values: ['Open', 'Mitigated', 'Closed'],
      message: 'Status must be one of: Open, Mitigated, Closed'
    },
    default: 'Open',
    required: true
  },
  owner: {
    type: String,
    maxLength: [100, 'Owner cannot exceed 100 characters'],
    trim: true
  },
  mitigation: {
    type: String,
    maxLength: [1000, 'Mitigation cannot exceed 1000 characters'],
    trim: true
  },
  dueDate: {
    type: Date
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

// Compound index for fast queries
riskSchema.index({ opportunityID: 1, status: 1 });
riskSchema.index({ status: 1 });
riskSchema.index({ dueDate: 1 });

// Virtual for risk score calculation
riskSchema.virtual('riskScore').get(function() {
  const scoreMap = { 'Low': 1, 'Medium': 2, 'High': 3 };
  const impactScore = scoreMap[this.impact] || 0;
  const probabilityScore = scoreMap[this.probability] || 0;
  return impactScore * probabilityScore;
});

// Virtual for risk level based on score
riskSchema.virtual('riskLevel').get(function() {
  const score = this.riskScore;
  if (score >= 6) return 'Critical';
  if (score >= 4) return 'High';
  if (score >= 2) return 'Medium';
  return 'Low';
});

// Ensure virtuals are included in JSON output
riskSchema.set('toJSON', { virtuals: true });
riskSchema.set('toObject', { virtuals: true });

// Instance method to clean output
riskSchema.methods.toJSON = function() {
  const risk = this.toObject({ virtuals: true });
  delete risk.__v;
  return risk;
};

const Risk = mongoose.model('Risk', riskSchema);

module.exports = Risk;
