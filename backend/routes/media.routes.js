const express = require('express');
const router = express.Router();
const { protect, optionalAuth } = require('../middleware/auth.middleware');
const { uploadSingle, uploadMultiple } = require('../middleware/upload.middleware');

// Import controller methods
const mediaController = require('../controllers/media.controller');

// Use optional authentication for all routes
router.use(optionalAuth);

// Media collection endpoints
router.route('/')
  .get(mediaController.getAllMedia) // GET /api/media (with filter query params for access control)
  .post(protect, uploadSingle, mediaController.uploadMedia); // POST /api/media (with file)

// Multiple file upload
router.post('/batch', protect, uploadMultiple, mediaController.uploadMultipleMedia);

// Media folders endpoint
router.get('/folders', protect, mediaController.getFolders);

// Search and filtering
router.get('/search', mediaController.searchMedia);

// Individual media item endpoints
router.route('/:id')
  .get(mediaController.getMediaById) // Already handles auth check inside
  .put(protect, mediaController.updateMedia)
  .delete(protect, mediaController.deleteMedia);

// Media operations
router.post('/:id/analyze', protect, mediaController.analyzeMedia);
router.patch('/:id/visibility', protect, mediaController.updateVisibility);

// Variants
router.route('/:id/variants')
  .post(protect, mediaController.createVariant);

router.route('/:id/variants/:variantName')
  .delete(protect, mediaController.deleteVariant);

module.exports = router; 