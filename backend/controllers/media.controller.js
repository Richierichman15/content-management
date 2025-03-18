const Media = require('../models/media.model');
const { 
  errorHandler, 
  asyncHandler, 
  NotFoundError, 
  AuthorizationError, 
  ValidationError 
} = require('../utils/errorHandler');
const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');
const { uploadToS3, deleteFromS3 } = require('../services/storage.service');

/**
 * Get all media
 * @route GET /api/media
 * @access Private
 */
exports.getAllMedia = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;
  
  const sort = req.query.sort || '-createdAt';
  const query = { uploadedBy: req.user.id };
  
  // Apply folder filter if provided
  if (req.query.folder) {
    query.folder = req.query.folder;
  }
  
  // Apply file type filter if provided
  if (req.query.fileType) {
    query.mimeType = new RegExp(`^${req.query.fileType}/`);
  }
  
  const total = await Media.countDocuments(query);
  
  const media = await Media.find(query)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .populate('uploadedBy', 'name email');
  
  res.json({
    media,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit)
    }
  });
});

/**
 * Get public media
 * @route GET /api/media/public
 * @access Public
 */
exports.getPublicMedia = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const query = { isPublic: true };
    
    // Apply folder filter if provided
    if (req.query.folder) {
      query.folder = req.query.folder;
    }
    
    // Apply file type filter if provided
    if (req.query.fileType) {
      query.mimeType = new RegExp(`^${req.query.fileType}/`);
    }
    
    const total = await Media.countDocuments(query);
    
    const media = await Media.find(query)
      .sort('-createdAt')
      .skip(skip)
      .limit(limit);
    
    res.json({
      media,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    errorHandler(res, error);
  }
};

/**
 * Get media by ID
 * @route GET /api/media/:id
 * @access Private
 */
exports.getMediaById = async (req, res) => {
  try {
    const media = await Media.findById(req.params.id)
      .populate('uploadedBy', 'name email');
    
    if (!media) {
      return res.status(404).json({ message: 'Media not found' });
    }
    
    // Check ownership or public status
    if (media.uploadedBy.toString() !== req.user.id && !media.isPublic) {
      return res.status(403).json({ message: 'Not authorized to access this media' });
    }
    
    // Increment usage count
    media.usageCount += 1;
    media.lastUsedAt = new Date();
    await media.save();
    
    res.json(media);
  } catch (error) {
    errorHandler(res, error);
  }
};

/**
 * Get public media by ID
 * @route GET /api/media/public/:id
 * @access Public
 */
exports.getPublicMediaById = async (req, res) => {
  try {
    const media = await Media.findOne({ 
      _id: req.params.id,
      isPublic: true 
    });
    
    if (!media) {
      return res.status(404).json({ message: 'Media not found or not public' });
    }
    
    // Increment usage count
    media.usageCount += 1;
    media.lastUsedAt = new Date();
    await media.save();
    
    res.json(media);
  } catch (error) {
    errorHandler(res, error);
  }
};

/**
 * Upload a single media file
 * @route POST /api/media/upload
 * @access Private
 */
exports.uploadMedia = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ValidationError('No file uploaded', { file: 'A file must be provided' });
  }
  
  // Get file details from multer
  const { originalname, mimetype, path: tempPath, filename, size } = req.file;
  
  // Validate file size (10MB limit)
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  if (size > MAX_FILE_SIZE) {
    throw new ValidationError('File too large', { file: 'File size must be less than 10MB' });
  }
  
  let dimensions = null;
  
  // If image, get dimensions using sharp
  if (mimetype.startsWith('image/')) {
    try {
      const metadata = await sharp(tempPath).metadata();
      dimensions = {
        width: metadata.width,
        height: metadata.height
      };
    } catch (err) {
      console.error('Error getting image dimensions:', err);
    }
  }

  // Extract folder from request if provided
  const folder = req.body.folder || '';
  
  // Upload to storage service (S3 or local)
  let uploadPath, url;
  try {
    // Check if uploadToS3 function exists (for cloud storage)
    if (typeof uploadToS3 === 'function') {
      const result = await uploadToS3(tempPath, filename, mimetype);
      uploadPath = result.key;
      url = result.url;
    } else {
      // If no cloud storage, use local path
      uploadPath = tempPath;
      url = `/uploads/${filename}`;
    }
  } catch (error) {
    throw new AppError('Error uploading file to storage', 500);
  }
  
  // Create media record
  const mediaData = {
    filename,
    originalFilename: originalname,
    path: uploadPath,
    url,
    mimeType: mimetype,
    size,
    uploadedBy: req.user.id,
    folder,
    title: req.body.title || originalname.replace(/\.[^/.]+$/, ""),
    description: req.body.description || '',
    alt: req.body.alt || '',
    tags: req.body.tags ? JSON.parse(req.body.tags) : [],
    isPublic: req.body.isPublic === 'true'
  };
  
  // Add dimensions if available
  if (dimensions) {
    mediaData.dimensions = dimensions;
  }
  
  const media = await Media.create(mediaData);
  
  res.status(201).json(media);
});

/**
 * Upload multiple media files
 * @route POST /api/media/upload/multiple
 * @access Private
 */
exports.uploadMultipleMedia = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }
    
    const uploadedMedia = [];
    const errors = [];
    
    // Process each file
    for (const file of req.files) {
      try {
        const { originalname, mimetype, path: tempPath, filename, size } = file;
        
        let dimensions = null;
        
        // If image, get dimensions
        if (mimetype.startsWith('image/')) {
          try {
            const metadata = await sharp(tempPath).metadata();
            dimensions = {
              width: metadata.width,
              height: metadata.height
            };
          } catch (err) {
            console.error('Error getting image dimensions:', err);
          }
        }
        
        // Extract folder from request if provided
        const folder = req.body.folder || '';
        
        // Upload to storage
        let uploadPath, url;
        try {
          if (typeof uploadToS3 === 'function') {
            const result = await uploadToS3(tempPath, filename, mimetype);
            uploadPath = result.key;
            url = result.url;
          } else {
            uploadPath = tempPath;
            url = `/uploads/${filename}`;
          }
        } catch (error) {
          errors.push({ file: originalname, error: 'Error uploading to storage' });
          continue;
        }
        
        // Create media record
        const mediaData = {
          filename,
          originalFilename: originalname,
          path: uploadPath,
          url,
          mimeType: mimetype,
          size,
          uploadedBy: req.user.id,
          folder,
          title: originalname.replace(/\.[^/.]+$/, ""),
          isPublic: req.body.isPublic === 'true'
        };
        
        // Add dimensions if available
        if (dimensions) {
          mediaData.dimensions = dimensions;
        }
        
        const media = await Media.create(mediaData);
        uploadedMedia.push(media);
      } catch (error) {
        errors.push({ file: file.originalname, error: error.message });
      }
    }
    
    res.status(201).json({
      media: uploadedMedia,
      errors: errors.length > 0 ? errors : undefined,
      success: uploadedMedia.length,
      failed: errors.length
    });
  } catch (error) {
    errorHandler(res, error);
  }
};

/**
 * Update media
 * @route PUT /api/media/:id
 * @access Private
 */
exports.updateMedia = async (req, res) => {
  try {
    let media = await Media.findById(req.params.id);
    
    if (!media) {
      return res.status(404).json({ message: 'Media not found' });
    }
    
    // Check ownership
    if (media.uploadedBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to update this media' });
    }
    
    const updateData = {
      title: req.body.title,
      description: req.body.description,
      alt: req.body.alt,
      folder: req.body.folder,
      isPublic: req.body.isPublic,
      accessibilityText: req.body.accessibilityText
    };
    
    // Handle tags
    if (req.body.tags) {
      updateData.tags = Array.isArray(req.body.tags) 
        ? req.body.tags 
        : JSON.parse(req.body.tags);
    }
    
    // Handle focal point
    if (req.body.focalPoint) {
      updateData.focalPoint = typeof req.body.focalPoint === 'object'
        ? req.body.focalPoint
        : JSON.parse(req.body.focalPoint);
    }
    
    // Update the media
    media = await Media.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    );
    
    res.json(media);
  } catch (error) {
    errorHandler(res, error);
  }
};

/**
 * Delete media
 * @route DELETE /api/media/:id
 * @access Private
 */
exports.deleteMedia = async (req, res) => {
  try {
    const media = await Media.findById(req.params.id);
    
    if (!media) {
      return res.status(404).json({ message: 'Media not found' });
    }
    
    // Check ownership
    if (media.uploadedBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this media' });
    }
    
    // Delete from storage
    try {
      if (typeof deleteFromS3 === 'function') {
        await deleteFromS3(media.path);
      } else {
        await fs.unlink(media.path);
      }
    } catch (error) {
      console.error('Error deleting file from storage:', error);
      // Continue with deletion of the database record even if file deletion fails
    }
    
    // Delete variants if they exist
    if (media.variants && media.variants.length > 0) {
      for (const variant of media.variants) {
        try {
          if (typeof deleteFromS3 === 'function') {
            await deleteFromS3(variant.url);
          } else {
            const variantPath = path.join(process.cwd(), 'uploads', path.basename(variant.url));
            await fs.unlink(variantPath);
          }
        } catch (error) {
          console.error(`Error deleting variant: ${variant.name}`, error);
        }
      }
    }
    
    // Delete from database
    await media.remove();
    
    res.json({ message: 'Media deleted successfully' });
  } catch (error) {
    errorHandler(res, error);
  }
};

/**
 * Search media
 * @route GET /api/media/search
 * @access Public/Private
 */
exports.searchMedia = async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.status(400).json({ message: 'Search query is required' });
    }
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    // Create base query
    const query = {
      $text: { $search: q }
    };
    
    // If not authenticated, only show public media
    if (!req.user) {
      query.isPublic = true;
    } else {
      // If authenticated, show own media plus public media
      query.$or = [
        { uploadedBy: req.user.id },
        { isPublic: true }
      ];
    }
    
    const total = await Media.countDocuments(query);
    
    const media = await Media.find(query, { 
      score: { $meta: 'textScore' } 
    })
      .sort({ score: { $meta: 'textScore' } })
      .skip(skip)
      .limit(limit);
    
    res.json({
      media,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    errorHandler(res, error);
  }
};

/**
 * Filter media
 * @route GET /api/media/filter
 * @access Public/Private
 */
exports.filterMedia = async (req, res) => {
  try {
    const { fileType, tags, folder } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    // Create base query
    const query = {};
    
    // If not authenticated, only show public media
    if (!req.user) {
      query.isPublic = true;
    } else {
      // If authenticated, show own media plus public media
      query.$or = [
        { uploadedBy: req.user.id },
        { isPublic: true }
      ];
    }
    
    // Apply file type filter
    if (fileType) {
      if (fileType === 'image') {
        query.mimeType = /^image\//;
      } else if (fileType === 'video') {
        query.mimeType = /^video\//;
      } else if (fileType === 'audio') {
        query.mimeType = /^audio\//;
      } else if (fileType === 'document') {
        query.mimeType = {
          $in: [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          ]
        };
      }
    }
    
    // Apply tags filter
    if (tags) {
      const tagList = tags.split(',').map(tag => tag.trim());
      query.tags = { $in: tagList };
    }
    
    // Apply folder filter
    if (folder) {
      query.folder = folder;
    }
    
    const total = await Media.countDocuments(query);
    
    const media = await Media.find(query)
      .sort('-createdAt')
      .skip(skip)
      .limit(limit);
    
    res.json({
      media,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    errorHandler(res, error);
  }
};

/**
 * Update media visibility
 * @route PATCH /api/media/:id/visibility
 * @access Private
 */
exports.updateVisibility = async (req, res) => {
  try {
    const { isPublic } = req.body;
    
    if (isPublic === undefined) {
      return res.status(400).json({ message: 'isPublic field is required' });
    }
    
    let media = await Media.findById(req.params.id);
    
    if (!media) {
      return res.status(404).json({ message: 'Media not found' });
    }
    
    // Check ownership
    if (media.uploadedBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to update this media' });
    }
    
    media = await Media.findByIdAndUpdate(
      req.params.id,
      { isPublic: !!isPublic },
      { new: true }
    );
    
    res.json(media);
  } catch (error) {
    errorHandler(res, error);
  }
};

/**
 * Analyze media with AI
 * @route POST /api/media/:id/analyze
 * @access Private
 */
exports.analyzeMedia = asyncHandler(async (req, res) => {
  const media = await Media.findById(req.params.id);
  
  if (!media) {
    throw new NotFoundError('Media');
  }
  
  // Check ownership
  if (media.uploadedBy.toString() !== req.user.id) {
    throw new AuthorizationError('Not authorized to analyze this media');
  }
  
  // Only analyze images for now
  if (!media.mimeType.startsWith('image/')) {
    throw new ValidationError('Only images can be analyzed', { mimeType: 'Must be an image file' });
  }

  // Get OpenAI service
  const openaiService = require('../services/openai.service');
  
  try {
    // Analyze image
    const analysisResult = await openaiService.analyzeImage(media.url);
    
    if (!analysisResult) {
      throw new AppError('AI analysis failed', 500);
    }
    
    // Update the media with AI-generated content
    media.aiTags = analysisResult.tags || [];
    media.aiDescription = analysisResult.description || '';
    
    // Add accessibility text if not already set
    if (!media.accessibilityText || media.accessibilityText.trim() === '') {
      media.accessibilityText = analysisResult.accessibilityText || '';
    }
    
    await media.save();
    
    res.json({
      success: true,
      media,
      analysis: {
        tags: media.aiTags,
        description: media.aiDescription,
        accessibilityText: analysisResult.accessibilityText
      }
    });
  } catch (aiError) {
    console.error('AI analysis error:', aiError);
    
    // Fallback to simulated AI if real AI fails
    const simulatedAITags = ['image', 'content', 'media'];
    const simulatedAIDescription = 'This is an image in the media library.';
    
    // Update the media with simulated content
    media.aiTags = simulatedAITags;
    media.aiDescription = simulatedAIDescription;
    await media.save();
    
    res.json({
      success: true,
      media,
      fallback: true,
      message: 'Used fallback analysis due to AI service error'
    });
  }
});

/**
 * Create image variant (resize, crop, etc.)
 * @route POST /api/media/:id/variants
 * @access Private
 */
exports.createVariant = async (req, res) => {
  try {
    const { width, height, name, effects = [] } = req.body;
    
    if (!width || !height || !name) {
      return res.status(400).json({ 
        message: 'Width, height and name are required' 
      });
    }
    
    const media = await Media.findById(req.params.id);
    
    if (!media) {
      return res.status(404).json({ message: 'Media not found' });
    }
    
    // Check ownership
    if (media.uploadedBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to create variants for this media' });
    }
    
    // Only process images
    if (!media.mimeType.startsWith('image/')) {
      return res.status(400).json({ message: 'Only images can have variants' });
    }
    
    // Check if variant with this name already exists
    const existingVariant = media.variants.find(v => v.name === name);
    if (existingVariant) {
      return res.status(400).json({ message: `Variant with name "${name}" already exists` });
    }
    
    // Process image with sharp
    let transformer = sharp(media.path);
    
    // Resize
    transformer = transformer.resize(
      parseInt(width, 10), 
      parseInt(height, 10),
      { fit: 'inside', withoutEnlargement: true }
    );
    
    // Apply effects
    if (effects.includes('grayscale')) {
      transformer = transformer.grayscale();
    }
    if (effects.includes('blur')) {
      transformer = transformer.blur(5);
    }
    if (effects.includes('sharpen')) {
      transformer = transformer.sharpen();
    }
    
    // Generate output filename
    const ext = path.extname(media.filename);
    const variantFilename = `${path.basename(media.filename, ext)}_${name}_${width}x${height}${ext}`;
    const outputPath = path.join(process.cwd(), 'uploads', variantFilename);
    
    // Save locally first
    await transformer.toFile(outputPath);
    
    // Get file info
    const stats = await fs.stat(outputPath);
    const metadata = await sharp(outputPath).metadata();
    
    let variantUrl = `/uploads/${variantFilename}`;
    let variantPath = outputPath;
    
    // Upload to S3 if available
    if (typeof uploadToS3 === 'function') {
      try {
        const result = await uploadToS3(outputPath, variantFilename, media.mimeType);
        variantPath = result.key;
        variantUrl = result.url;
        
        // Delete local copy
        await fs.unlink(outputPath);
      } catch (error) {
        console.error('Error uploading variant to S3:', error);
        // Continue using local path if S3 upload fails
      }
    }
    
    // Create variant object
    const variant = {
      name,
      url: variantUrl,
      width: metadata.width,
      height: metadata.height,
      fileSize: stats.size,
      effects
    };
    
    // Add to media's variants array
    media.variants.push(variant);
    await media.save();
    
    res.status(201).json({
      success: true,
      variant,
      media
    });
  } catch (error) {
    errorHandler(res, error);
  }
};

/**
 * Delete image variant
 * @route DELETE /api/media/:id/variants/:variantName
 * @access Private
 */
exports.deleteVariant = async (req, res) => {
  try {
    const { variantName } = req.params;
    
    const media = await Media.findById(req.params.id);
    
    if (!media) {
      return res.status(404).json({ message: 'Media not found' });
    }
    
    // Check ownership
    if (media.uploadedBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete variants for this media' });
    }
    
    // Find variant
    const variantIndex = media.variants.findIndex(v => v.name === variantName);
    
    if (variantIndex === -1) {
      return res.status(404).json({ message: `Variant "${variantName}" not found` });
    }
    
    const variant = media.variants[variantIndex];
    
    // Delete file
    try {
      if (typeof deleteFromS3 === 'function') {
        await deleteFromS3(variant.url);
      } else {
        const variantPath = path.join(process.cwd(), 'uploads', path.basename(variant.url));
        await fs.unlink(variantPath);
      }
    } catch (error) {
      console.error('Error deleting variant file:', error);
      // Continue with deletion from the database even if file deletion fails
    }
    
    // Remove from variants array
    media.variants.splice(variantIndex, 1);
    await media.save();
    
    res.json({
      success: true,
      message: `Variant "${variantName}" deleted successfully`
    });
  } catch (error) {
    errorHandler(res, error);
  }
};

/**
 * Get folders
 * @route GET /api/media/folders
 * @access Private
 */
exports.getFolders = async (req, res) => {
  try {
    // Get all distinct folders for the user
    const folders = await Media.distinct('folder', { 
      uploadedBy: req.user.id 
    });
    
    // Count items in each folder
    const folderStats = await Promise.all(
      folders.map(async (folder) => {
        const count = await Media.countDocuments({
          uploadedBy: req.user.id,
          folder
        });
        
        return {
          name: folder || 'Uncategorized',
          count
        };
      })
    );
    
    res.json(folderStats);
  } catch (error) {
    errorHandler(res, error);
  }
}; 