const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const opportunitySchema = new mongoose.Schema({
  _id: {
    type: String,
    default: () => uuidv4()
  },
  objectID: {
    type: String,
    trim: true
  },
  opportunityID: {
    type: String,
    required: [true, 'Opportunity ID is required'],
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    maxLength: [200, 'Name cannot exceed 200 characters'],
    trim: true
  },
  accountID: {
    type: String,
    trim: true
  },
  salesStage: {
    type: String,
    enum: {
      values: ['Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost'],
      message: 'Sales stage must be one of: Qualified, Proposal, Negotiation, Won, Lost'
    }
  },
  expectedRevenueAmount: {
    type: Number,
    min: [0, 'Revenue amount cannot be negative']
  },
  currency: {
    type: String,
    default: 'USD',
    maxLength: 3
  },
  closeDate: {
    type: Date
  },
  source: {
    type: String,
    enum: ['manual', 'sap_crm'],
    default: 'manual'
  }
}, {
  timestamps: true,
  _id: false // We're using custom _id
});

// Indexes
opportunitySchema.index({ opportunityID: 1 });
opportunitySchema.index({ salesStage: 1 });
opportunitySchema.index({ closeDate: 1 });

// Instance method to clean output
opportunitySchema.methods.toJSON = function() {
  const opportunity = this.toObject();
  delete opportunity.__v;
  return opportunity;
};

const Opportunity = mongoose.model('Opportunity', opportunitySchema);

module.exports = Opportunity;
