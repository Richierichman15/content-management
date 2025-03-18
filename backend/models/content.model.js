const mongoose = require('mongoose');

const contentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot be more than 200 characters']
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  content: {
    type: String,
    required: [true, 'Content is required']
  },
  excerpt: {
    type: String,
    trim: true,
    maxlength: [500, 'Excerpt cannot be more than 500 characters']
  },
  featuredImage: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  categories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  }],
  tags: [{
    type: String,
    trim: true
  }],
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastEditor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  publishedAt: {
    type: Date,
    default: null
  },
  scheduledPublish: {
    type: Date,
    default: null
  },
  isTemplate: {
    type: Boolean,
    default: false
  },
  templateCategory: {
    type: String,
    enum: ['blog', 'newsletter', 'social', 'product', 'page', 'email', 'other'],
    default: 'other'
  },
  aiGenerated: {
    type: Boolean,
    default: false
  },
  embedding: {
    type: [Number],
    select: false, // Don't include this field in regular queries
    sparse: true
  },
  embeddingUpdatedAt: {
    type: Date,
    default: null
  },
  readabilityScore: {
    type: Number,
    min: 0,
    max: 100,
    default: null
  },
  seoScore: {
    type: Number,
    min: 0,
    max: 100,
    default: null
  },
  sentimentAnalysis: {
    type: Object,
    default: null
  },
  aiSuggestions: [{
    type: {
      type: String,
      enum: ['content', 'seo', 'structure', 'grammar'],
      required: true
    },
    suggestion: {
      type: String,
      required: true
    },
    applied: {
      type: Boolean,
      default: false
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  views: {
    type: Number,
    default: 0
  },
  revisionHistory: [{
    editor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    changes: {
      type: String
    },
    changedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for faster queries
contentSchema.index({ title: 'text', content: 'text', tags: 'text' });

// Pre-save hook to generate slug if not provided
contentSchema.pre('save', function(next) {
  if (!this.slug) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  next();
});

// Virtual for estimated reading time
contentSchema.virtual('readingTime').get(function() {
  const wordsPerMinute = 200;
  const wordCount = this.content.trim().split(/\s+/).length;
  const readingTime = Math.ceil(wordCount / wordsPerMinute);
  return readingTime;
});

const Content = mongoose.model('Content', contentSchema);

module.exports = Content; 