const Content = require('../models/content.model');
const Category = require('../models/category.model');
const mongoose = require('mongoose');

/**
 * Get all content items
 */
exports.getAllContent = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Filter options
    const filter = {};
    
    // By default, exclude templates unless specifically requested
    if (!req.query.includeTemplates) {
      filter.isTemplate = { $ne: true };
    }
    
    // Status filter
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    // Category filter
    if (req.query.category) {
      filter.categories = req.query.category;
    }
    
    // Author filter (if not admin, only show own content)
    if (req.user.role !== 'admin' && !req.query.all) {
      filter.author = req.user.id;
    } else if (req.query.author) {
      filter.author = req.query.author;
    }
    
    // Tags filter
    if (req.query.tag) {
      filter.tags = req.query.tag;
    }
    
    // Get total count for pagination
    const total = await Content.countDocuments(filter);
    
    // Find content with pagination
    let query = Content.find(filter)
                       .sort({ createdAt: -1 })
                       .skip(skip)
                       .limit(limit)
                       .populate('author', 'firstName lastName')
                       .populate('categories', 'name');
    
    if (req.query.fields) {
      const fields = req.query.fields.split(',').join(' ');
      query = query.select(fields);
    }
    
    const content = await query;
    
    res.status(200).json({
      status: 'success',
      results: content.length,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit
      },
      data: {
        content
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * Get content by ID
 */
exports.getContentById = async (req, res) => {
  try {
    const content = await Content.findById(req.params.id)
                                  .populate('author', 'firstName lastName')
                                  .populate('categories', 'name');
    
    if (!content) {
      return res.status(404).json({
        status: 'fail',
        message: 'Content not found'
      });
    }
    
    // Check permissions
    if (content.author._id.toString() !== req.user.id && 
        req.user.role !== 'admin' && 
        req.user.role !== 'editor') {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have permission to view this content'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        content
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * Create new content
 */
exports.createContent = async (req, res) => {
  try {
    // Set author to current user
    req.body.author = req.user.id;
    
    // Handle categories
    if (req.body.categories) {
      // Check if categories exist
      const categoryIds = Array.isArray(req.body.categories) 
        ? req.body.categories 
        : req.body.categories.split(',').map(id => id.trim());
      
      const validCategories = await Category.countDocuments({
        _id: { $in: categoryIds }
      });
      
      if (validCategories !== categoryIds.length) {
        return res.status(400).json({
          status: 'fail',
          message: 'One or more categories do not exist'
        });
      }
      
      req.body.categories = categoryIds;
    }
    
    const content = await Content.create(req.body);
    
    res.status(201).json({
      status: 'success',
      data: {
        content
      }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * Update content
 */
exports.updateContent = async (req, res) => {
  try {
    const content = await Content.findById(req.params.id);
    
    if (!content) {
      return res.status(404).json({
        status: 'fail',
        message: 'Content not found'
      });
    }
    
    // Check permissions
    if (content.author.toString() !== req.user.id && 
        req.user.role !== 'admin' && 
        req.user.role !== 'editor') {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have permission to update this content'
      });
    }
    
    // Handle categories
    if (req.body.categories) {
      const categoryIds = Array.isArray(req.body.categories) 
        ? req.body.categories 
        : req.body.categories.split(',').map(id => id.trim());
      
      const validCategories = await Category.countDocuments({
        _id: { $in: categoryIds }
      });
      
      if (validCategories !== categoryIds.length) {
        return res.status(400).json({
          status: 'fail',
          message: 'One or more categories do not exist'
        });
      }
      
      req.body.categories = categoryIds;
    }
    
    // Save the previous version to revision history
    const revisionEntry = {
      editor: req.user.id,
      changes: 'Content updated',
      content: {
        title: content.title,
        content: content.content,
        excerpt: content.excerpt,
        status: content.status
      }
    };
    
    // Set last editor
    req.body.lastEditor = req.user.id;
    
    // If status changes to published, set publishedAt
    if (req.body.status === 'published' && content.status !== 'published') {
      req.body.publishedAt = new Date();
    }
    
    // Push to revision history
    content.revisionHistory.push(revisionEntry);
    
    // Update the content
    Object.keys(req.body).forEach(key => {
      content[key] = req.body[key];
    });
    
    await content.save();
    
    res.status(200).json({
      status: 'success',
      data: {
        content
      }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * Delete content
 */
exports.deleteContent = async (req, res) => {
  try {
    const content = await Content.findById(req.params.id);
    
    if (!content) {
      return res.status(404).json({
        status: 'fail',
        message: 'Content not found'
      });
    }
    
    // Check permissions
    if (content.author.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have permission to delete this content'
      });
    }
    
    await Content.findByIdAndDelete(req.params.id);
    
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * Search content
 */
exports.searchContent = async (req, res) => {
  try {
    const { query, category, status, tag, author } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const filter = { isTemplate: { $ne: true } };
    
    // Only show published content for public search
    if (!req.user) {
      filter.status = 'published';
    }
    
    // Text search
    if (query) {
      filter.$text = { $search: query };
    }
    
    // Filters
    if (category) {
      filter.categories = category;
    }
    
    if (status && req.user) {
      filter.status = status;
    }
    
    if (tag) {
      filter.tags = tag;
    }
    
    if (author) {
      filter.author = author;
    }
    
    // Get total count for pagination
    const total = await Content.countDocuments(filter);
    
    // Sort by relevance if text search, otherwise by date
    const sort = query ? { score: { $meta: 'textScore' } } : { createdAt: -1 };
    
    // Find content
    const content = await Content.find(filter)
                                  .sort(sort)
                                  .skip(skip)
                                  .limit(limit)
                                  .populate('author', 'firstName lastName')
                                  .populate('categories', 'name');
    
    res.status(200).json({
      status: 'success',
      results: content.length,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit
      },
      data: {
        content
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * Get content versions
 */
exports.getContentVersions = async (req, res) => {
  try {
    const content = await Content.findById(req.params.id);
    
    if (!content) {
      return res.status(404).json({
        status: 'fail',
        message: 'Content not found'
      });
    }
    
    // Check permissions
    if (content.author.toString() !== req.user.id && 
        req.user.role !== 'admin' && 
        req.user.role !== 'editor') {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have permission to view versions of this content'
      });
    }
    
    // Format versions and add metadata
    const formattedVersions = await Promise.all(content.revisionHistory.map(async (version, index) => {
      // Get editor name if available
      let createdBy = 'Unknown';
      if (version.editor) {
        const User = mongoose.model('User');
        const editor = await User.findById(version.editor).select('firstName lastName');
        if (editor) {
          createdBy = `${editor.firstName} ${editor.lastName}`;
        }
      }
      
      return {
        id: version._id,
        createdAt: version.changedAt,
        createdBy,
        comment: version.changes,
        isLatest: index === content.revisionHistory.length - 1
      };
    }));
    
    // Add current version if no versions exist
    if (formattedVersions.length === 0) {
      const User = mongoose.model('User');
      let createdBy = 'Unknown';
      
      if (content.author) {
        const author = await User.findById(content.author).select('firstName lastName');
        if (author) {
          createdBy = `${author.firstName} ${author.lastName}`;
        }
      }
      
      formattedVersions.push({
        id: 'current',
        createdAt: content.updatedAt,
        createdBy,
        comment: 'Current version',
        isLatest: true
      });
    }
    
    res.status(200).json({
      status: 'success',
      versions: formattedVersions.reverse() // Most recent first
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * Restore content version
 */
exports.restoreContentVersion = async (req, res) => {
  try {
    const content = await Content.findById(req.params.id);
    
    if (!content) {
      return res.status(404).json({
        status: 'fail',
        message: 'Content not found'
      });
    }
    
    // Check permissions
    if (content.author.toString() !== req.user.id && 
        req.user.role !== 'admin' && 
        req.user.role !== 'editor') {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have permission to restore versions of this content'
      });
    }
    
    // Find the version to restore
    const versionToRestore = content.revisionHistory.id(req.params.versionId);
    
    if (!versionToRestore) {
      return res.status(404).json({
        status: 'fail',
        message: 'Version not found'
      });
    }
    
    // Save current version to history before restoring
    const currentVersion = {
      editor: req.user.id,
      changes: 'Saved before version restore',
      content: {
        title: content.title,
        content: content.content,
        excerpt: content.excerpt,
        status: content.status
      }
    };
    
    content.revisionHistory.push(currentVersion);
    
    // Restore the version
    if (versionToRestore.content) {
      if (versionToRestore.content.title) content.title = versionToRestore.content.title;
      if (versionToRestore.content.content) content.content = versionToRestore.content.content;
      if (versionToRestore.content.excerpt) content.excerpt = versionToRestore.content.excerpt;
    }
    
    // Mark as restored version
    content.revisionHistory.push({
      editor: req.user.id,
      changes: `Restored version from ${new Date(versionToRestore.changedAt).toLocaleString()}`,
      changedAt: new Date()
    });
    
    await content.save();
    
    res.status(200).json({
      status: 'success',
      data: {
        content
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * Get content schedule
 */
exports.getContentSchedule = async (req, res) => {
  try {
    const content = await Content.findById(req.params.id).select('scheduledPublish status');
    
    if (!content) {
      return res.status(404).json({
        status: 'fail',
        message: 'Content not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      scheduledPublish: content.scheduledPublish,
      currentStatus: content.status
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * Schedule content
 */
exports.scheduleContent = async (req, res) => {
  try {
    const content = await Content.findById(req.params.id);
    
    if (!content) {
      return res.status(404).json({
        status: 'fail',
        message: 'Content not found'
      });
    }
    
    // Check permissions
    if (content.author.toString() !== req.user.id && 
        req.user.role !== 'admin' && 
        req.user.role !== 'editor') {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have permission to schedule this content'
      });
    }
    
    // Validate date is in the future
    const scheduledPublish = new Date(req.body.scheduledPublish);
    
    if (scheduledPublish <= new Date()) {
      return res.status(400).json({
        status: 'fail',
        message: 'Scheduled publish date must be in the future'
      });
    }
    
    content.scheduledPublish = scheduledPublish;
    await content.save();
    
    res.status(200).json({
      status: 'success',
      data: {
        scheduledPublish: content.scheduledPublish
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * Delete schedule
 */
exports.deleteSchedule = async (req, res) => {
  try {
    const content = await Content.findById(req.params.id);
    
    if (!content) {
      return res.status(404).json({
        status: 'fail',
        message: 'Content not found'
      });
    }
    
    // Check permissions
    if (content.author.toString() !== req.user.id && 
        req.user.role !== 'admin' && 
        req.user.role !== 'editor') {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have permission to modify this content'
      });
    }
    
    content.scheduledPublish = null;
    await content.save();
    
    res.status(200).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * Get all templates
 */
exports.getAllTemplates = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    
    // Filter for templates only
    const filter = { isTemplate: true };
    
    // Category filter
    if (req.query.category && req.query.category !== 'all') {
      filter.templateCategory = req.query.category;
    }
    
    // Get total count for pagination
    const total = await Content.countDocuments(filter);
    
    // Find templates with pagination
    const templates = await Content.find(filter)
                                   .sort({ updatedAt: -1 })
                                   .skip(skip)
                                   .limit(limit)
                                   .select('title excerpt featuredImage templateCategory tags updatedAt')
                                   .lean();
    
    // Add reading time for each template
    const templatesWithReadingTime = templates.map(template => {
      const wordsPerMinute = 200;
      if (template.content) {
        const wordCount = template.content.trim().split(/\s+/).length;
        template.readingTime = Math.ceil(wordCount / wordsPerMinute);
      } else {
        template.readingTime = 0;
      }
      return template;
    });
    
    res.status(200).json({
      status: 'success',
      results: templatesWithReadingTime.length,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit
      },
      templates: templatesWithReadingTime
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * Create template
 */
exports.createTemplate = async (req, res) => {
  try {
    // Require admin or editor role
    if (req.user.role !== 'admin' && req.user.role !== 'editor') {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have permission to create templates'
      });
    }
    
    // Set as template
    req.body.isTemplate = true;
    
    // Validate template category
    if (!req.body.templateCategory) {
      req.body.templateCategory = 'other';
    }
    
    // Set author to current user
    req.body.author = req.user.id;
    
    const template = await Content.create(req.body);
    
    res.status(201).json({
      status: 'success',
      data: {
        template
      }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * Use template
 */
exports.useTemplate = async (req, res) => {
  try {
    const template = await Content.findById(req.params.id);
    
    if (!template || !template.isTemplate) {
      return res.status(404).json({
        status: 'fail',
        message: 'Template not found'
      });
    }
    
    // Create new content from template
    const newContent = {
      title: req.body.title || `${template.title} (Copy)`,
      content: template.content,
      excerpt: template.excerpt,
      categories: template.categories,
      tags: template.tags,
      featuredImage: template.featuredImage,
      author: req.user.id,
      status: 'draft',
      isTemplate: false
    };
    
    // Create slug based on new title
    newContent.slug = newContent.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    
    const content = await Content.create(newContent);
    
    res.status(201).json({
      status: 'success',
      data: {
        content
      }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
}; 