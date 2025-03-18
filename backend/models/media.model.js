const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: [true, 'Filename is required'],
    trim: true
  },
  originalFilename: {
    type: String,
    required: [true, 'Original filename is required'],
    trim: true
  },
  path: {
    type: String,
    required: [true, 'File path is required'],
    trim: true
  },
  url: {
    type: String,
    required: [true, 'URL is required'],
    trim: true
  },
  mimeType: {
    type: String,
    required: [true, 'MIME type is required'],
    trim: true
  },
  size: {
    type: Number,
    required: [true, 'File size is required']
  },
  title: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  alt: {
    type: String,
    trim: true
  },
  folder: {
    type: String,
    default: '',
    trim: true
  },
  categories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  }],
  tags: [{
    type: String,
    trim: true
  }],
  aiGenerated: {
    tags: [{
      type: String,
      trim: true
    }],
    description: {
      type: String,
      default: ''
    },
    analysis: {
      type: Object,
      default: {}
    },
    generatedAt: {
      type: Date,
      default: Date.now
    }
  },
  dimensions: {
    width: Number,
    height: Number
  },
  exif: {
    type: Object,
    default: {}
  },
  optimized: {
    type: Boolean,
    default: false
  },
  originalSize: {
    type: Number
  },
  variants: [{
    name: String,
    url: String,
    width: Number,
    height: Number,
    fileSize: Number,
    effects: [String]
  }],
  usageCount: {
    type: Number,
    default: 0
  },
  lastUsedAt: {
    type: Date
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  accessibilityText: {
    type: String,
    trim: true
  },
  focalPoint: {
    x: {
      type: Number,
      default: 0.5
    },
    y: {
      type: Number,
      default: 0.5
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for faster queries
mediaSchema.index({ 
  filename: 'text', 
  title: 'text', 
  description: 'text', 
  tags: 'text',
  'aiGenerated.tags': 'text',
  'aiGenerated.description': 'text',
  folder: 'text'
});

// Virtual for file type (image, video, document, etc.)
mediaSchema.virtual('fileType').get(function() {
  const mime = this.mimeType;
  
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime === 'application/pdf') return 'pdf';
  if (['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(mime)) {
    return 'document';
  }
  if (['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'].includes(mime)) {
    return 'spreadsheet';
  }
  if (['application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'].includes(mime)) {
    return 'presentation';
  }
  
  return 'other';
});

// Pre-save hook to set title from filename if not provided
mediaSchema.pre('save', function(next) {
  if (!this.title) {
    this.title = this.originalFilename.replace(/\.[^/.]+$/, ""); // Remove extension
  }
  next();
});

const Media = mongoose.model('Media', mediaSchema);

module.exports = Media; 