const mongoose = require('mongoose');

/**
 * Schema for content versions to keep track of changes
 */
const contentVersionSchema = new mongoose.Schema({
  // Reference to the content this version belongs to
  contentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Content',
    required: true
  },
  
  // Version data fields
  title: {
    type: String,
    required: true,
    trim: true
  },
  
  content: {
    type: String,
    required: true
  },
  
  excerpt: {
    type: String,
    trim: true
  },
  
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    required: true
  },
  
  categories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  }],
  
  tags: [{
    type: String,
    trim: true
  }],
  
  featuredImage: {
    type: Object,
    default: null
  },
  
  seo: {
    type: Object,
    default: {}
  },
  
  // Comment explaining what changed in this version
  comment: {
    type: String,
    required: true
  },
  
  // User who created this version
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // When this version was created
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create compound index for efficient retrieval
contentVersionSchema.index({ contentId: 1, createdAt: -1 });

const ContentVersion = mongoose.model('ContentVersion', contentVersionSchema);

module.exports = ContentVersion; 