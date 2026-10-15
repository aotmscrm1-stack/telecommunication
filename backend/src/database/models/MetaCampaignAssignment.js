const mongoose = require('mongoose');

const metaCampaignAssignmentSchema = new mongoose.Schema({
  campaign: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true // e.g. 'SAP_Leads', 'Python_Leads', 'Digital Marketing_Leads', 'CyberSecurity_Leads'
  },
  assignedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('MetaCampaignAssignment', metaCampaignAssignmentSchema);
