const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');

// Import controller methods
const aiController = require('../controllers/ai.controller');

// All routes require authentication
router.use(protect);

// AI content generation
router.post('/generate/text', aiController.generateText);
router.post('/generate/title', aiController.generateTitle);
router.post('/generate/excerpt', aiController.generateExcerpt);
router.post('/generate/outline', aiController.generateOutline);

// AI content enhancement
router.post('/enhance/seo', aiController.enhanceSEO);
router.post('/enhance/readability', aiController.enhanceReadability);
router.post('/enhance/grammar', aiController.enhanceGrammar);
router.post('/enhance/style', aiController.enhanceStyle);

// AI content analysis
router.post('/analyze/content', aiController.analyzeContent);
router.post('/analyze/sentiment', aiController.analyzeSentiment);
router.post('/analyze/readability', aiController.analyzeReadability);
router.post('/analyze/keywords', aiController.extractKeywords);

// AI image analysis
router.post('/analyze/image', aiController.analyzeImage);
router.post('/analyze/image/tags', aiController.generateImageTags);
router.post('/analyze/image/description', aiController.generateImageDescription);

module.exports = router; 