const mongoose = require('mongoose');

/**
 * Schema for scheduling content publication and unpublication
 */
const contentScheduleSchema = new mongoose.Schema({
  // Reference to the content being scheduled
  contentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Content',
    required: true
  },
  
  // The date when the action should be performed
  scheduledDate: {
    type: Date,
    required: true
  },
  
  // The action to perform: publish or unpublish
  action: {
    type: String,
    enum: ['publish', 'unpublish'],
    required: true
  },
  
  // When this schedule was created
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  // Optional note about the schedule
  note: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Create compound index to ensure uniqueness for contentId + action
contentScheduleSchema.index({ contentId: 1, action: 1 }, { unique: true });

// Create index on scheduledDate for efficient queries
contentScheduleSchema.index({ scheduledDate: 1 });

const ContentSchedule = mongoose.model('ContentSchedule', contentScheduleSchema);

module.exports = ContentSchedule; 