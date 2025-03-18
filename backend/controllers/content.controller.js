const Content = require('../models/content.model');
const Category = require('../models/category.model');
const mongoose = require('mongoose');
const { 
  errorHandler, 
  asyncHandler, 
  NotFoundError, 
  AuthorizationError, 
  ValidationError 
} = require('../utils/errorHandler');

/**
 * Get all content items
 * @route GET /api/content
 * @access Private
 */
exports.getAllContent = asyncHandler(async (req, res) => {
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
});

/**
 * Get content by ID
 * @route GET /api/content/:id
 * @access Private
 */
exports.getContentById = asyncHandler(async (req, res) => {
  const content = await Content.findById(req.params.id)
                                .populate('author', 'firstName lastName')
                                .populate('categories', 'name');
  
  if (!content) {
    throw new NotFoundError('Content');
  }
  
  // Check permissions
  if (content.author._id.toString() !== req.user.id && 
      req.user.role !== 'admin' && 
      req.user.role !== 'editor') {
    throw new AuthorizationError('You do not have permission to view this content');
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      content
    }
  });
});

/**
 * Create new content
 * @route POST /api/content
 * @access Private
 */
exports.createContent = asyncHandler(async (req, res) => {
  const {
    title,
    content,
    excerpt,
    slug,
    status = 'draft',
    categories = [],
    tags = [],
    isTemplate = false,
    templateId,
    publishDate,
    unpublishDate,
    seoData = {},
    featured = false
  } = req.body;

  // Validate required fields
  if (!title) {
    throw new ValidationError('Title is required', { title: 'Title field cannot be empty' });
  }

  // Generate slug if not provided
  let contentSlug = slug;
  if (!contentSlug) {
    contentSlug = title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-');
  }

  // Check if slug is unique
  const existingContent = await Content.findOne({ slug: contentSlug });
  if (existingContent) {
    contentSlug = `${contentSlug}-${Date.now().toString().slice(-4)}`;
  }

  // If using a template, get the template data
  let templateData = {};
  if (templateId) {
    const template = await Content.findOne({ _id: templateId, isTemplate: true });
    if (!template) {
      throw new NotFoundError('Template');
    }
    templateData = {
      content: template.content,
      structure: template.structure,
      templateMeta: {
        originalTemplate: templateId,
        appliedAt: new Date()
      }
    };
  }

  // Process featured image if uploaded
  let featuredImage = null;
  if (req.file) {
    featuredImage = {
      url: req.file.path,
      alt: req.body.featuredImageAlt || title,
      caption: req.body.featuredImageCaption || ''
    };
  }

  // Create new content
  const newContent = new Content({
    title,
    content: content || templateData.content || '',
    excerpt,
    slug: contentSlug,
    status,
    author: req.user.id,
    categories,
    tags,
    featuredImage,
    isTemplate,
    seo: seoData,
    featured,
    ...templateData
  });

  // Save to database
  await newContent.save();

  // If there's a publish date, schedule it
  if (publishDate && status !== 'published') {
    const schedulerService = require('../services/scheduler.service');
    await schedulerService.scheduleContent(newContent._id, publishDate, 'publish');
  }

  // If there's an unpublish date, schedule it
  if (unpublishDate && status === 'published') {
    const schedulerService = require('../services/scheduler.service');
    await schedulerService.scheduleContent(newContent._id, unpublishDate, 'unpublish');
  }

  // Create initial version for versioning
  await this.createContentVersion(newContent._id, 'Initial creation', req.user.id);

  res.status(201).json({
    message: 'Content created successfully',
    content: newContent
  });
});

/**
 * Update content
 * @route PUT /api/content/:id
 * @access Private
 */
exports.updateContent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    title,
    content,
    excerpt,
    slug,
    status,
    categories,
    tags,
    seoData,
    featured,
    versionComment,
    publishDate,
    unpublishDate
  } = req.body;

  // Find content by ID
  const existingContent = await Content.findById(id);

  if (!existingContent) {
    throw new NotFoundError('Content');
  }

  // Check if user is authorized to update this content
  if (existingContent.author.toString() !== req.user.id && req.user.role !== 'admin') {
    throw new AuthorizationError('Not authorized to update this content');
  }

  // If slug is being changed, check if the new slug is unique
  if (slug && slug !== existingContent.slug) {
    const slugExists = await Content.findOne({ slug, _id: { $ne: id } });
    if (slugExists) {
      throw new ValidationError('Slug already in use', { slug: 'This slug is already taken' });
    }
  }

  // Process featured image if uploaded
  let featuredImage = existingContent.featuredImage;
  if (req.file) {
    featuredImage = {
      url: req.file.path,
      alt: req.body.featuredImageAlt || title || existingContent.title,
      caption: req.body.featuredImageCaption || ''
    };
  }

  // Create a version before updating
  await this.createContentVersion(
    id, 
    versionComment || `Updated by ${req.user.name || req.user.email}`, 
    req.user.id
  );

  // Update the content
  const updatedContent = await Content.findByIdAndUpdate(
    id,
    {
      $set: {
        title: title || existingContent.title,
        content: content || existingContent.content,
        excerpt: excerpt !== undefined ? excerpt : existingContent.excerpt,
        slug: slug || existingContent.slug,
        status: status || existingContent.status,
        categories: categories || existingContent.categories,
        tags: tags || existingContent.tags,
        featuredImage,
        seo: seoData || existingContent.seo,
        featured: featured !== undefined ? featured : existingContent.featured,
        updatedAt: Date.now()
      }
    },
    { new: true, runValidators: true }
  );

  // Handle scheduling
  const schedulerService = require('../services/scheduler.service');
  
  // If publish date provided and content is not published, schedule publication
  if (publishDate && status !== 'published') {
    await schedulerService.updateSchedule(id, publishDate, 'publish');
  } else if (publishDate === null) {
    // If publishDate set to null, remove any publish schedule
    await schedulerService.removeSchedule(id, 'publish');
  }
  
  // Handle unpublish scheduling
  if (unpublishDate && status === 'published') {
    await schedulerService.updateSchedule(id, unpublishDate, 'unpublish');
  } else if (unpublishDate === null) {
    // If unpublishDate set to null, remove any unpublish schedule
    await schedulerService.removeSchedule(id, 'unpublish');
  }

  res.json({
    message: 'Content updated successfully',
    content: updatedContent
  });
});

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
 * @route GET /api/content/:id/versions
 * @access Private
 */
exports.getContentVersions = async (req, res) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Check if content exists and user has access
    const content = await Content.findById(id);
    if (!content) {
      return res.status(404).json({ message: 'Content not found' });
    }

    // Get versions
    const ContentVersion = mongoose.model('ContentVersion');
    const versions = await ContentVersion.find({ contentId: id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'name email');

    // Get total count for pagination
    const total = await ContentVersion.countDocuments({ contentId: id });

    res.json({
      versions,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching content versions:', error);
    res.status(500).json({
      message: 'Error fetching content versions',
      error: error.message
    });
  }
};

/**
 * Restore content version
 * @route POST /api/content/:id/versions/:versionId/restore
 * @access Private
 */
exports.restoreContentVersion = async (req, res) => {
  try {
    const { id, versionId } = req.params;
    
    // Check if content exists and user has access
    const content = await Content.findById(id);
    if (!content) {
      return res.status(404).json({ message: 'Content not found' });
    }

    // Check if user is authorized to update this content
    if (content.author.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to restore versions of this content' });
    }

    // Get the version
    const ContentVersion = mongoose.model('ContentVersion');
    const version = await ContentVersion.findById(versionId);
    
    if (!version || version.contentId.toString() !== id) {
      return res.status(404).json({ message: 'Version not found for this content' });
    }

    // Create a version of current state before restoring
    await this.createContentVersion(
      id, 
      `State before restoring to version from ${new Date(version.createdAt).toLocaleString()}`, 
      req.user.id
    );

    // Update content with version data
    const updatedContent = await Content.findByIdAndUpdate(
      id,
      {
        $set: {
          title: version.title,
          content: version.content,
          excerpt: version.excerpt,
          status: version.status,
          categories: version.categories,
          tags: version.tags,
          featuredImage: version.featuredImage,
          seo: version.seo,
          updatedAt: Date.now()
        }
      },
      { new: true }
    );

    res.json({
      message: 'Content version restored successfully',
      content: updatedContent
    });
  } catch (error) {
    console.error('Error restoring content version:', error);
    res.status(500).json({
      message: 'Error restoring content version',
      error: error.message
    });
  }
};

/**
 * Schedule content publication/unpublication
 * @route POST /api/content/:id/schedule
 * @access Private
 */
exports.scheduleContent = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, action } = req.body;

    // Validate inputs
    if (!date) {
      return res.status(400).json({ message: 'Date is required' });
    }

    if (!['publish', 'unpublish'].includes(action)) {
      return res.status(400).json({ message: 'Action must be either "publish" or "unpublish"' });
    }

    // Check if content exists
    const content = await Content.findById(id);
    if (!content) {
      return res.status(404).json({ message: 'Content not found' });
    }

    // Check authorization
    if (content.author.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to schedule this content' });
    }

    // Schedule the content
    const schedulerService = require('../services/scheduler.service');
    const scheduled = await schedulerService.scheduleContent(id, new Date(date), action);

    res.json({
      message: `Content ${action} scheduled for ${new Date(date).toLocaleString()}`,
      scheduled
    });
  } catch (error) {
    console.error(`Error scheduling content:`, error);
    res.status(500).json({
      message: 'Error scheduling content',
      error: error.message
    });
  }
};

/**
 * Get content schedule
 * @route GET /api/content/:id/schedule
 * @access Private
 */
exports.getContentSchedule = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if content exists
    const content = await Content.findById(id);
    if (!content) {
      return res.status(404).json({ message: 'Content not found' });
    }

    // Get schedule
    const schedulerService = require('../services/scheduler.service');
    const schedule = await schedulerService.getContentSchedule(id);

    res.json(schedule);
  } catch (error) {
    console.error('Error getting content schedule:', error);
    res.status(500).json({
      message: 'Error getting content schedule',
      error: error.message
    });
  }
};

/**
 * Delete content schedule
 * @route DELETE /api/content/:id/schedule
 * @access Private
 */
exports.deleteSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.query; // 'publish', 'unpublish', or undefined for both

    // Check if content exists
    const content = await Content.findById(id);
    if (!content) {
      return res.status(404).json({ message: 'Content not found' });
    }

    // Check authorization
    if (content.author.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to manage schedules for this content' });
    }

    // Delete the schedule
    const schedulerService = require('../services/scheduler.service');
    
    if (action) {
      // Delete specific schedule type
      if (!['publish', 'unpublish'].includes(action)) {
        return res.status(400).json({ message: 'Action must be either "publish" or "unpublish"' });
      }
      await schedulerService.removeSchedule(id, action);
      res.json({ message: `${action} schedule removed successfully` });
    } else {
      // Delete all schedules for this content
      await schedulerService.removeAllSchedules(id);
      res.json({ message: 'All schedules removed successfully' });
    }
  } catch (error) {
    console.error('Error deleting content schedule:', error);
    res.status(500).json({
      message: 'Error deleting content schedule',
      error: error.message
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

/**
 * Create a version of content for the versioning system
 * @private
 */
exports.createContentVersion = async (contentId, comment, userId) => {
  try {
    // Get the current content
    const content = await Content.findById(contentId);
    if (!content) {
      throw new Error('Content not found');
    }

    // Create new version record
    const version = {
      contentId,
      title: content.title,
      content: content.content,
      excerpt: content.excerpt,
      status: content.status,
      categories: content.categories,
      tags: content.tags,
      featuredImage: content.featuredImage,
      seo: content.seo,
      comment,
      createdBy: userId,
      createdAt: new Date()
    };

    // Store in ContentVersion model
    const ContentVersion = mongoose.model('ContentVersion');
    await ContentVersion.create(version);

    // Limit to 10 most recent versions per content
    const allVersions = await ContentVersion.find({ contentId })
      .sort({ createdAt: -1 });
    
    if (allVersions.length > 10) {
      // Delete oldest versions beyond the 10 limit
      const versionsToDelete = allVersions.slice(10);
      for (const oldVersion of versionsToDelete) {
        await ContentVersion.findByIdAndDelete(oldVersion._id);
      }
    }

    return true;
  } catch (error) {
    console.error('Error creating content version:', error);
    return false;
  }
}; 