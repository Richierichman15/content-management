const express = require('express');
const router = express.Router();
const { protect, admin, optionalAuth, authorize } = require('../middleware/auth.middleware');
const { uploadSingle, uploadMultiple } = require('../middleware/upload.middleware');

// Import controller methods
const contentController = require('../controllers/content.controller');

// Use optional authentication for all routes
router.use(optionalAuth);

// Public routes
router.get('/published', contentController.getAllContent);
router.get('/published/:slug', contentController.getContent);
router.get('/categories', contentController.getAllContent);
router.get('/categories/:slug', contentController.getContent);
router.get('/search', contentController.getAllContent);

// Content CRUD operations - protected routes
router.get('/', contentController.getAllContent);
router.post('/', protect, uploadSingle, contentController.getAllContent);
router.get('/:id', contentController.getContent);
router.put('/:id', protect, uploadSingle, contentController.getAllContent);
router.delete('/:id', protect, contentController.getAllContent);

// Content special operations - protected routes
router.patch('/:id/status', protect, contentController.getAllContent);
router.post('/:id/analyze', protect, contentController.getAllContent);
router.get('/:id/suggestions', protect, contentController.getAllContent);
router.post('/:id/suggestions/:suggestionId/apply', protect, contentController.getAllContent);
router.get('/:id/revisions', protect, contentController.getAllContent);
router.post('/:id/revisions/:revisionId/restore', protect, contentController.getAllContent);

// Category operations - restricted to admins and editors
router.use('/categories', protect);
router.post('/categories', contentController.getAllContent);
router.put('/categories/:id', contentController.getAllContent);
router.delete('/categories/:id', contentController.getAllContent);

// Versioning
router.get('/:id/versions', contentController.getAllContent);
router.post('/:id/versions/:versionId/restore', contentController.getAllContent);

// Scheduling
router.route('/:id/schedule')
  .get(contentController.getAllContent)
  .post(contentController.getAllContent)
  .delete(contentController.getAllContent);

// Templates
router.get('/templates', contentController.getAllContent);
router.post('/templates', contentController.getAllContent);
router.post('/templates/:id/use', contentController.getAllContent);

module.exports = router; 