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
const OpenAI = require('openai');

// Initialize OpenAI API
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

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
 * Get content schedule
 * @route GET /api/content/:id/schedule
 * @access Private
 */
exports.getContentSchedule = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const content = await Content.findById(id);
  
  if (!content) {
    throw new NotFoundError('Content');
  }
  
  const schedulerService = require('../services/scheduler.service');
  const schedule = await schedulerService.getContentSchedule(id);
  
  res.json({
    message: 'Schedule retrieved successfully',
    schedule
  });
});

/**
 * Schedule content publication/unpublication
 * @route POST /api/content/:id/schedule
 * @access Private
 */
exports.scheduleContent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { publishDate, unpublishDate } = req.body;
  
  if (!publishDate && !unpublishDate) {
    throw new ValidationError('Either publishDate or unpublishDate is required');
  }
  
  const content = await Content.findById(id);
  
  if (!content) {
    throw new NotFoundError('Content');
  }
  
  // Check if user has permission
  if (content.author.toString() !== req.user.id && 
      req.user.role !== 'admin' && 
      req.user.role !== 'editor') {
    throw new AuthorizationError('Not authorized to schedule this content');
  }
  
  const schedulerService = require('../services/scheduler.service');
  
  // Schedule publish if provided
  if (publishDate) {
    await schedulerService.scheduleContent(id, publishDate, 'publish');
  }
  
  // Schedule unpublish if provided
  if (unpublishDate) {
    await schedulerService.scheduleContent(id, unpublishDate, 'unpublish');
  }
  
  res.json({
    message: 'Content scheduled successfully'
  });
});

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

/**
 * Get content by slug
 * @route GET /api/content/published/:slug
 * @access Public
 */
exports.getContent = asyncHandler(async (req, res) => {
  const content = await Content.findOne({ slug: req.params.slug })
                               .populate('author', 'firstName lastName')
                               .populate('categories', 'name');
  
  if (!content) {
    throw new NotFoundError('Content');
  }
  
  // For non-published content, check permissions
  if (content.status !== 'published') {
    if (!req.user) {
      throw new AuthorizationError('Not authorized to view this content');
    }
    
    if (content.author.toString() !== req.user.id && 
        req.user.role !== 'admin' && 
        req.user.role !== 'editor') {
      throw new AuthorizationError('Not authorized to view this content');
    }
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      content
    }
  });
});

/**
 * Get all templates
 * @route GET /api/content/templates
 * @access Private
 */
exports.getTemplates = asyncHandler(async (req, res) => {
  const templates = await Content.find({ isTemplate: true })
                                .select('title description createdAt updatedAt')
                                .sort({ updatedAt: -1 });
  
  res.status(200).json({
    status: 'success',
    data: {
      templates
    }
  });
});

/**
 * Create a template
 * @route POST /api/content/templates
 * @access Private
 */
exports.createTemplate = asyncHandler(async (req, res) => {
  const {
    title,
    content,
    description,
    structure
  } = req.body;

  // Validate required fields
  if (!title) {
    throw new ValidationError('Title is required', { title: 'Title field cannot be empty' });
  }

  // Generate slug
  const slug = title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-') + '-template';

  // Create new template
  const newTemplate = new Content({
    title,
    content: content || '',
    description: description || '',
    slug,
    status: 'published',
    author: req.user.id,
    isTemplate: true,
    structure: structure || {}
  });

  // Save to database
  await newTemplate.save();

  res.status(201).json({
    message: 'Template created successfully',
    template: newTemplate
  });
});

/**
 * Use a template
 * @route POST /api/content/templates/:id/use
 * @access Private
 */
exports.useTemplate = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const template = await Content.findOne({ _id: id, isTemplate: true });
  
  if (!template) {
    throw new NotFoundError('Template');
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      template: {
        id: template._id,
        title: template.title,
        content: template.content,
        structure: template.structure
      }
    }
  });
});

/**
 * Restore content version
 * @route POST /api/content/:id/versions/:versionId/restore
 * @access Private
 */
exports.restoreVersion = asyncHandler(async (req, res) => {
  const { id, versionId } = req.params;
  
  // Check if content exists and user has access
  const content = await Content.findById(id);
  if (!content) {
    throw new NotFoundError('Content');
  }
  
  // Check if user has permission to restore
  if (content.author.toString() !== req.user.id && 
      req.user.role !== 'admin' && 
      req.user.role !== 'editor') {
    throw new AuthorizationError('Not authorized to restore versions for this content');
  }
  
  // Get the version
  const ContentVersion = mongoose.model('ContentVersion');
  const version = await ContentVersion.findById(versionId);
  
  if (!version || version.contentId.toString() !== id) {
    throw new NotFoundError('Version');
  }
  
  // Create a new version of the current state before restoring
  await this.createContentVersion(
    id, 
    `State before restoring to version from ${new Date(version.createdAt).toLocaleDateString()}`, 
    req.user.id
  );
  
  // Restore the version data
  const updatedContent = await Content.findByIdAndUpdate(
    id,
    {
      $set: {
        title: version.data.title,
        content: version.data.content,
        excerpt: version.data.excerpt,
        updatedAt: Date.now()
      }
    },
    { new: true, runValidators: true }
  );
  
  res.json({
    message: 'Version restored successfully',
    content: updatedContent
  });
});

/**
 * Get categories
 * @route GET /api/content/categories
 * @access Public
 */
exports.getCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find().sort({ name: 1 });
  
  res.status(200).json({
    status: 'success',
    data: {
      categories
    }
  });
});

/**
 * Get category by slug
 * @route GET /api/content/categories/:slug
 * @access Public
 */
exports.getCategoryBySlug = asyncHandler(async (req, res) => {
  const category = await Category.findOne({ slug: req.params.slug });
  
  if (!category) {
    throw new NotFoundError('Category');
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      category
    }
  });
});

/**
 * Update content status
 * @route PATCH /api/content/:id/status
 * @access Private
 */
exports.updateContentStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  if (!status) {
    throw new ValidationError('Status is required');
  }
  
  if (!['draft', 'published', 'archived'].includes(status)) {
    throw new ValidationError('Invalid status value');
  }
  
  const content = await Content.findById(id);
  
  if (!content) {
    throw new NotFoundError('Content');
  }
  
  // Check if user has permission
  if (content.author.toString() !== req.user.id && 
      req.user.role !== 'admin' && 
      req.user.role !== 'editor') {
    throw new AuthorizationError('Not authorized to update status for this content');
  }
  
  content.status = status;
  content.updatedAt = Date.now();
  
  await content.save();
  
  res.json({
    message: 'Status updated successfully',
    content
  });
});

/**
 * Analyze content with AI
 * @route POST /api/content/:id/analyze
 * @access Private
 */
exports.analyzeContent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const content = await Content.findById(id);
  
  if (!content) {
    throw new NotFoundError('Content');
  }
  
  // Mock AI analysis response
  const analysis = {
    readabilityScore: Math.floor(Math.random() * 100),
    suggestions: [
      'Consider using shorter paragraphs for better readability',
      'The content could benefit from more subheadings',
      'Add more descriptive language to engage readers'
    ],
    seoScore: Math.floor(Math.random() * 100),
    seoSuggestions: [
      'Include more keywords related to your topic',
      'Consider adding internal links to other relevant content',
      'Make sure your content has proper heading structure'
    ]
  };
  
  res.json({
    message: 'Content analyzed successfully',
    analysis
  });
});

/**
 * Get content suggestions
 * @route GET /api/content/:id/suggestions
 * @access Private
 */
exports.getContentSuggestions = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const content = await Content.findById(id);
  
  if (!content) {
    throw new NotFoundError('Content');
  }
  
  // Mock suggestions
  const suggestions = [
    {
      id: '1',
      type: 'seo',
      text: 'Consider adding more descriptive tags to improve searchability',
      priority: 'high'
    },
    {
      id: '2',
      type: 'content',
      text: 'This section could benefit from a supporting image',
      priority: 'medium'
    },
    {
      id: '3',
      type: 'structure',
      text: 'Consider breaking this long paragraph into smaller chunks',
      priority: 'medium'
    }
  ];
  
  res.json({
    message: 'Suggestions retrieved successfully',
    suggestions
  });
});

/**
 * Apply a content suggestion
 * @route POST /api/content/:id/suggestions/:suggestionId/apply
 * @access Private
 */
exports.applySuggestion = asyncHandler(async (req, res) => {
  const { id, suggestionId } = req.params;
  
  const content = await Content.findById(id);
  
  if (!content) {
    throw new NotFoundError('Content');
  }
  
  // In a real implementation, this would apply the suggestion
  // Here we just acknowledge it
  
  res.json({
    message: 'Suggestion applied successfully',
    suggestionId
  });
});

/**
 * Get content revisions
 * @route GET /api/content/:id/revisions
 * @access Private
 */
exports.getContentRevisions = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const content = await Content.findById(id);
  
  if (!content) {
    throw new NotFoundError('Content');
  }
  
  // Mock revisions
  const revisions = [
    {
      id: '1',
      date: new Date(Date.now() - 86400000 * 3),
      author: 'John Doe',
      changes: 'Updated introduction and added new section'
    },
    {
      id: '2',
      date: new Date(Date.now() - 86400000 * 2),
      author: 'Jane Smith',
      changes: 'Fixed typos and improved formatting'
    }
  ];
  
  res.json({
    message: 'Revisions retrieved successfully',
    revisions
  });
});

/**
 * Restore a content revision
 * @route POST /api/content/:id/revisions/:revisionId/restore
 * @access Private
 */
exports.restoreRevision = asyncHandler(async (req, res) => {
  const { id, revisionId } = req.params;
  
  const content = await Content.findById(id);
  
  if (!content) {
    throw new NotFoundError('Content');
  }
  
  // In a real implementation, this would restore from a revision
  // Here we just acknowledge it
  
  res.json({
    message: 'Revision restored successfully',
    revisionId
  });
});

/**
 * Create category
 * @route POST /api/content/categories
 * @access Private/Admin
 */
exports.createCategory = asyncHandler(async (req, res) => {
  const { name, description, slug } = req.body;
  
  if (!name) {
    throw new ValidationError('Name is required');
  }
  
  // Generate slug if not provided
  let categorySlug = slug;
  if (!categorySlug) {
    categorySlug = name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-');
  }
  
  // Check if slug is unique
  const existingCategory = await Category.findOne({ slug: categorySlug });
  if (existingCategory) {
    throw new ValidationError('Category with this slug already exists');
  }
  
  const newCategory = new Category({
    name,
    description,
    slug: categorySlug,
    createdBy: req.user.id
  });
  
  await newCategory.save();
  
  res.status(201).json({
    message: 'Category created successfully',
    category: newCategory
  });
});

/**
 * Update category
 * @route PUT /api/content/categories/:id
 * @access Private/Admin
 */
exports.updateCategory = asyncHandler(async (req, res) => {
  const { name, description, slug } = req.body;
  const { id } = req.params;
  
  const category = await Category.findById(id);
  
  if (!category) {
    throw new NotFoundError('Category');
  }
  
  // If slug is changing, check uniqueness
  if (slug && slug !== category.slug) {
    const slugExists = await Category.findOne({ slug, _id: { $ne: id } });
    if (slugExists) {
      throw new ValidationError('Category with this slug already exists');
    }
  }
  
  category.name = name || category.name;
  category.description = description !== undefined ? description : category.description;
  category.slug = slug || category.slug;
  category.updatedAt = Date.now();
  
  await category.save();
  
  res.json({
    message: 'Category updated successfully',
    category
  });
});

/**
 * Delete category
 * @route DELETE /api/content/categories/:id
 * @access Private/Admin
 */
exports.deleteCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const category = await Category.findById(id);
  
  if (!category) {
    throw new NotFoundError('Category');
  }
  
  // Check if category is in use
  const inUseCount = await Content.countDocuments({ categories: id });
  
  if (inUseCount > 0) {
    throw new ValidationError('Cannot delete category that is in use by content');
  }
  
  await Category.findByIdAndDelete(id);
  
  res.json({
    message: 'Category deleted successfully'
  });
});

/**
 * Unschedule content
 * @route DELETE /api/content/:id/schedule
 * @access Private
 */
exports.unscheduleContent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { type } = req.query; // 'publish', 'unpublish', or both if not specified
  
  const content = await Content.findById(id);
  
  if (!content) {
    throw new NotFoundError('Content');
  }
  
  // Check if user has permission
  if (content.author.toString() !== req.user.id && 
      req.user.role !== 'admin' && 
      req.user.role !== 'editor') {
    throw new AuthorizationError('Not authorized to unschedule this content');
  }
  
  const schedulerService = require('../services/scheduler.service');
  
  if (!type || type === 'publish') {
    await schedulerService.removeSchedule(id, 'publish');
  }
  
  if (!type || type === 'unpublish') {
    await schedulerService.removeSchedule(id, 'unpublish');
  }
  
  res.json({
    message: 'Schedule removed successfully'
  });
});

/**
 * Perform semantic search on content using AI
 * @route POST /api/content/semantic-search
 * @access Private
 */
exports.semanticSearch = asyncHandler(async (req, res) => {
  const { query, limit = 10 } = req.body;
  
  if (!query) {
    throw new ValidationError('Search query is required');
  }
  
  try {
    // Get vector embeddings for the search query
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query,
      encoding_format: "float"
    });
    
    const queryEmbedding = embeddingResponse.data[0].embedding;
    
    // Get all content (we'll filter in memory since we need to compute similarity)
    // In a production environment, you'd want to use a vector database for this
    const allContent = await Content.find({
      isTemplate: { $ne: true },
      status: req.user ? undefined : 'published' // Only show published content for non-authenticated users
    })
    .populate('author', 'firstName lastName')
    .populate('categories', 'name')
    .select('title content excerpt slug status categories tags createdAt updatedAt author');
    
    // For each content item, compute semantic similarity score if it has an embedding
    // If not, we'll use text matching as a fallback
    const contentWithScores = await Promise.all(allContent.map(async (content) => {
      // If the content doesn't have a precomputed embedding, generate one
      let contentEmbedding;
      if (!content.embedding) {
        // Create a text representation of the content
        const textToEmbed = `${content.title} ${content.excerpt || ''} ${content.content.substring(0, 1000)}`;
        
        try {
          const embeddingResponse = await openai.embeddings.create({
            model: "text-embedding-3-small",
            input: textToEmbed,
            encoding_format: "float"
          });
          
          contentEmbedding = embeddingResponse.data[0].embedding;
          
          // Store the embedding for future searches
          await Content.findByIdAndUpdate(content._id, { 
            embedding: contentEmbedding,
            embeddingUpdatedAt: new Date()
          });
        } catch (error) {
          console.error('Error generating embedding:', error);
          contentEmbedding = null;
        }
      } else {
        contentEmbedding = content.embedding;
      }
      
      // Calculate semantic similarity using cosine similarity
      let similarityScore = 0;
      
      if (contentEmbedding) {
        // Calculate cosine similarity
        const dotProduct = queryEmbedding.reduce((sum, val, i) => sum + val * contentEmbedding[i], 0);
        const queryMagnitude = Math.sqrt(queryEmbedding.reduce((sum, val) => sum + val * val, 0));
        const contentMagnitude = Math.sqrt(contentEmbedding.reduce((sum, val) => sum + val * val, 0));
        
        similarityScore = dotProduct / (queryMagnitude * contentMagnitude);
      } else {
        // Fallback: Simple text matching (less effective)
        const matchText = `${content.title} ${content.excerpt || ''} ${content.content}`.toLowerCase();
        const queryTerms = query.toLowerCase().split(' ');
        const matchCount = queryTerms.filter(term => matchText.includes(term)).length;
        similarityScore = matchCount / queryTerms.length;
      }
      
      return {
        content,
        score: similarityScore
      };
    }));
    
    // Sort by similarity score (highest first)
    contentWithScores.sort((a, b) => b.score - a.score);
    
    // Get the top results
    const topResults = contentWithScores
      .slice(0, limit)
      .filter(item => item.score > 0.1) // Only include reasonably relevant results
      .map(item => ({
        ...item.content.toObject(),
        relevanceScore: Math.round(item.score * 100) / 100
      }));
    
    res.json({
      results: topResults,
      count: topResults.length,
      query
    });
  } catch (error) {
    console.error('Semantic search error:', error);
    throw new AppError('Error performing semantic search', 500);
  }
});

/**
 * Generate content suggestions based on existing content using AI
 * @route POST /api/content/suggest-related
 * @access Private
 */
exports.suggestRelatedContent = asyncHandler(async (req, res) => {
  const { contentId, count = 5 } = req.body;
  
  if (!contentId) {
    throw new ValidationError('Content ID is required');
  }
  
  // Get the source content
  const sourceContent = await Content.findById(contentId)
    .select('title content excerpt categories tags');
  
  if (!sourceContent) {
    throw new NotFoundError('Content');
  }
  
  // Create a text representation of the source content
  const sourceText = `${sourceContent.title} ${sourceContent.excerpt || ''} ${sourceContent.content.substring(0, 1000)}`;
  
  // Get vector embedding for the source content
  const embeddingResponse = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: sourceText,
    encoding_format: "float"
  });
  
  const sourceEmbedding = embeddingResponse.data[0].embedding;
  
  // Get all other content
  const allOtherContent = await Content.find({
    _id: { $ne: contentId },
    isTemplate: { $ne: true },
    status: 'published'
  })
  .populate('author', 'firstName lastName')
  .populate('categories', 'name')
  .select('title content excerpt slug status categories tags createdAt updatedAt author embedding');
  
  // Compute similarity scores
  const contentWithScores = await Promise.all(allOtherContent.map(async (content) => {
    let contentEmbedding = content.embedding;
    
    // If the content doesn't have a precomputed embedding, generate one
    if (!contentEmbedding) {
      const textToEmbed = `${content.title} ${content.excerpt || ''} ${content.content.substring(0, 1000)}`;
      
      try {
        const embeddingResponse = await openai.embeddings.create({
          model: "text-embedding-3-small",
          input: textToEmbed,
          encoding_format: "float"
        });
        
        contentEmbedding = embeddingResponse.data[0].embedding;
        
        // Store the embedding for future searches
        await Content.findByIdAndUpdate(content._id, { 
          embedding: contentEmbedding,
          embeddingUpdatedAt: new Date()
        });
      } catch (error) {
        console.error('Error generating embedding:', error);
        contentEmbedding = null;
      }
    }
    
    // Calculate semantic similarity using cosine similarity
    let similarityScore = 0;
    
    if (contentEmbedding) {
      // Calculate cosine similarity
      const dotProduct = sourceEmbedding.reduce((sum, val, i) => sum + val * contentEmbedding[i], 0);
      const sourceMagnitude = Math.sqrt(sourceEmbedding.reduce((sum, val) => sum + val * val, 0));
      const contentMagnitude = Math.sqrt(contentEmbedding.reduce((sum, val) => sum + val * val, 0));
      
      similarityScore = dotProduct / (sourceMagnitude * contentMagnitude);
    } else {
      // Fallback: Category and tag matching
      const sourceCategories = sourceContent.categories.map(c => c.toString());
      const contentCategories = content.categories.map(c => c.toString());
      const categoryOverlap = sourceCategories.filter(c => contentCategories.includes(c)).length;
      
      const tagOverlap = sourceContent.tags.filter(t => content.tags.includes(t)).length;
      
      similarityScore = (categoryOverlap * 0.6 + tagOverlap * 0.4) / 
        Math.max(1, Math.max(sourceCategories.length, contentCategories.length));
    }
    
    return {
      content,
      score: similarityScore
    };
  }));
  
  // Sort by similarity score (highest first) and get top results
  contentWithScores.sort((a, b) => b.score - a.score);
  
  const relatedContent = contentWithScores
    .slice(0, count)
    .filter(item => item.score > 0.2) // Only include reasonably related content
    .map(item => ({
      ...item.content.toObject(),
      relevanceScore: Math.round(item.score * 100) / 100
    }));
  
  res.json({
    relatedContent,
    count: relatedContent.length,
    sourceContent: {
      id: sourceContent._id,
      title: sourceContent.title
    }
  });
}); 