const express = require('express');
const router = express.Router();
const { protect, optionalAuth } = require('../middleware/auth.middleware');
const { uploadSingle, uploadMultiple } = require('../middleware/upload.middleware');

// Import controller methods
const mediaController = require('../controllers/media.controller');

// Use optional authentication for all routes
router.use(optionalAuth);

// Public routes
router.get('/public', mediaController.getPublicMedia);
router.get('/public/:id', mediaController.getPublicMediaById);
router.get('/search', mediaController.searchMedia);
router.get('/filter', mediaController.filterMedia);

// Protected routes - require authentication
router.get('/', protect, mediaController.getAllMedia);
router.post('/upload', protect, uploadSingle, mediaController.uploadMedia);
router.post('/upload/multiple', protect, uploadMultiple, mediaController.uploadMultipleMedia);
router.get('/:id', protect, mediaController.getMediaById);
router.put('/:id', protect, mediaController.updateMedia);
router.delete('/:id', protect, mediaController.deleteMedia);
router.post('/:id/analyze', protect, mediaController.analyzeMedia);
router.patch('/:id/visibility', protect, mediaController.updateVisibility);

// New enhanced routes for image processing
router.post('/:id/variants', protect, mediaController.createVariant);
router.delete('/:id/variants/:variantName', protect, mediaController.deleteVariant);

// Media organization
router.get('/folders', protect, mediaController.getFolders);

module.exports = router; 