const OpenAI = require('openai');
const { errorHandler, asyncHandler } = require('../utils/errorHandler');

// Initialize OpenAI API
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Generate text content using AI
 * @route POST /api/ai/generate/text
 * @access Private
 */
exports.generateText = asyncHandler(async (req, res) => {
  const { prompt, length = 500, tone = 'informative' } = req.body;
  
  if (!prompt) {
    return res.status(400).json({ message: 'Prompt is required' });
  }
  
  const enhancedPrompt = `Generate a ${tone} text about "${prompt}" that is approximately ${length} words long.`;
  
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are a professional content writer who specializes in creating ${tone} content. Format your response using markdown.`
      },
      {
        role: "user",
        content: enhancedPrompt
      }
    ],
    max_tokens: Math.min(4000, length * 2),
    temperature: 0.7
  });
  
  res.json({
    generatedText: completion.choices[0].message.content,
    usage: completion.usage
  });
});

/**
 * Generate title suggestions using AI
 * @route POST /api/ai/generate/title
 * @access Private
 */
exports.generateTitle = asyncHandler(async (req, res) => {
  const { content, keywords = [], count = 5 } = req.body;
  
  if (!content) {
    return res.status(400).json({ message: 'Content is required' });
  }
  
  const keywordsText = keywords.length > 0 ? `incorporating these keywords if possible: ${keywords.join(', ')}` : '';
  
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: "You are a professional headline writer who creates engaging, clickable titles."
      },
      {
        role: "user",
        content: `Generate ${count} engaging title suggestions for the following content ${keywordsText}:\n\n${content.substring(0, 2000)}`
      }
    ],
    max_tokens: 500,
    temperature: 0.8
  });
  
  // Parse the returned titles
  const titleText = completion.choices[0].message.content;
  const titles = titleText.split('\n')
    .filter(line => line.trim().length > 0)
    .map(line => line.replace(/^\d+[\.\)]\s*/, '').trim())
    .slice(0, count);
  
  res.json({
    titles,
    usage: completion.usage
  });
});

/**
 * Generate excerpt/summary using AI
 * @route POST /api/ai/generate/excerpt
 * @access Private
 */
exports.generateExcerpt = asyncHandler(async (req, res) => {
  const { content, length = 150 } = req.body;
  
  if (!content) {
    return res.status(400).json({ message: 'Content is required' });
  }
  
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: "You create engaging, concise summaries that capture the essence of content."
      },
      {
        role: "user",
        content: `Generate a compelling excerpt/summary of this content in approximately ${length} characters that would make someone want to read the full article:\n\n${content.substring(0, 5000)}`
      }
    ],
    max_tokens: 300,
    temperature: 0.7
  });
  
  const excerpt = completion.choices[0].message.content.trim();
  
  res.json({
    excerpt,
    usage: completion.usage
  });
});

/**
 * Generate content outline using AI
 * @route POST /api/ai/generate/outline
 * @access Private
 */
exports.generateOutline = asyncHandler(async (req, res) => {
  const { topic, sections = 5, depth = 2 } = req.body;
  
  if (!topic) {
    return res.status(400).json({ message: 'Topic is required' });
  }
  
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: "You create well-structured content outlines with logical progression of ideas."
      },
      {
        role: "user",
        content: `Generate a detailed outline for content about "${topic}" with approximately ${sections} main sections and a depth of ${depth} levels. Format as markdown with clear hierarchy.`
      }
    ],
    max_tokens: 1000,
    temperature: 0.7
  });
  
  const outline = completion.choices[0].message.content;
  
  res.json({
    outline,
    usage: completion.usage
  });
});

/**
 * Enhance SEO of content using AI
 * @route POST /api/ai/enhance/seo
 * @access Private
 */
exports.enhanceSEO = asyncHandler(async (req, res) => {
  const { content, keywords = [] } = req.body;
  
  if (!content) {
    return res.status(400).json({ message: 'Content is required' });
  }
  
  const keywordsText = keywords.length > 0 ? 
    `with a focus on these keywords: ${keywords.join(', ')}` : 
    'with appropriate keywords';
  
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: "You are an SEO expert who enhances content for better search engine visibility while maintaining readability and natural flow."
      },
      {
        role: "user",
        content: `Improve the SEO of this content ${keywordsText}. Add appropriate headings, improve keyword density, and enhance the overall structure. Return the improved version, not just suggestions:\n\n${content.substring(0, 5000)}`
      }
    ],
    max_tokens: Math.min(4000, content.length),
    temperature: 0.5
  });
  
  const enhancedContent = completion.choices[0].message.content;
  
  res.json({
    enhancedContent,
    usage: completion.usage
  });
});

/**
 * Enhance readability of content using AI
 * @route POST /api/ai/enhance/readability
 * @access Private
 */
exports.enhanceReadability = asyncHandler(async (req, res) => {
  const { content, targetLevel = 'general' } = req.body;
  
  if (!content) {
    return res.status(400).json({ message: 'Content is required' });
  }
  
  const levelMap = {
    'simple': 'simple language (around 5th grade reading level)',
    'general': 'general audience (around 8th grade reading level)',
    'advanced': 'educated audience (around college level)',
    'expert': 'expert audience with domain knowledge'
  };
  
  const targetAudience = levelMap[targetLevel] || levelMap['general'];
  
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: "You are an editor who specializes in improving content readability and flow."
      },
      {
        role: "user",
        content: `Improve the readability of this content for ${targetAudience}. Simplify complex sentences, use active voice, add more paragraph breaks, and enhance overall flow. Return the improved version, not just suggestions:\n\n${content.substring(0, 5000)}`
      }
    ],
    max_tokens: Math.min(4000, content.length),
    temperature: 0.5
  });
  
  const enhancedContent = completion.choices[0].message.content;
  
  res.json({
    enhancedContent,
    usage: completion.usage
  });
});

/**
 * Enhance grammar of content using AI
 * @route POST /api/ai/enhance/grammar
 * @access Private
 */
exports.enhanceGrammar = asyncHandler(async (req, res) => {
  const { content } = req.body;
  
  if (!content) {
    return res.status(400).json({ message: 'Content is required' });
  }
  
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: "You are a professional editor who specializes in grammar, spelling, and punctuation correction."
      },
      {
        role: "user",
        content: `Correct any grammar, spelling, punctuation, and stylistic errors in this content. Return the corrected version, not just suggestions:\n\n${content.substring(0, 5000)}`
      }
    ],
    max_tokens: Math.min(4000, content.length),
    temperature: 0.3
  });
  
  const enhancedContent = completion.choices[0].message.content;
  
  res.json({
    enhancedContent,
    usage: completion.usage
  });
});

/**
 * Enhance writing style of content using AI
 * @route POST /api/ai/enhance/style
 * @access Private
 */
exports.enhanceStyle = asyncHandler(async (req, res) => {
  const { content, targetStyle = 'professional' } = req.body;
  
  if (!content) {
    return res.status(400).json({ message: 'Content is required' });
  }
  
  const styleMap = {
    'professional': 'a professional, business-like style',
    'conversational': 'a friendly, conversational style',
    'academic': 'an academic, scholarly style',
    'persuasive': 'a persuasive, compelling style',
    'creative': 'a creative, engaging style'
  };
  
  const stylePrompt = styleMap[targetStyle] || styleMap['professional'];
  
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are an editor who specializes in enhancing writing to match ${stylePrompt}.`
      },
      {
        role: "user",
        content: `Enhance this content to match ${stylePrompt}. Improve word choice, sentence structure, and overall tone while preserving the original meaning. Return the enhanced version, not just suggestions:\n\n${content.substring(0, 5000)}`
      }
    ],
    max_tokens: Math.min(4000, content.length),
    temperature: 0.6
  });
  
  const enhancedContent = completion.choices[0].message.content;
  
  res.json({
    enhancedContent,
    usage: completion.usage
  });
});

/**
 * Analyze content using AI
 * @route POST /api/ai/analyze/content
 * @access Private
 */
exports.analyzeContent = asyncHandler(async (req, res) => {
  const { content } = req.body;
  
  if (!content) {
    return res.status(400).json({ message: 'Content is required' });
  }
  
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: "You are a content analyst who provides detailed, actionable feedback on content quality, structure, and effectiveness."
      },
      {
        role: "user",
        content: `Analyze this content and provide detailed feedback on its structure, clarity, engagement, and overall effectiveness. Include specific strengths and areas for improvement:\n\n${content.substring(0, 5000)}`
      }
    ],
    max_tokens: 1000,
    temperature: 0.5
  });
  
  const analysis = completion.choices[0].message.content;
  
  res.json({
    analysis,
    usage: completion.usage
  });
});

/**
 * Analyze sentiment of content using AI
 * @route POST /api/ai/analyze/sentiment
 * @access Private
 */
exports.analyzeSentiment = asyncHandler(async (req, res) => {
  const { content } = req.body;
  
  if (!content) {
    return res.status(400).json({ message: 'Content is required' });
  }
  
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: "You are a sentiment analysis expert who provides detailed insights on the emotional tone of content."
      },
      {
        role: "user",
        content: `Analyze the sentiment of this content. Provide an overall sentiment score (positive, negative, or neutral), identify key emotional tones, and highlight specific phrases that contribute to the sentiment. Format your response as JSON with the following structure:
        {
          "overallSentiment": "positive/negative/neutral/mixed",
          "sentimentScore": {number from -1 to 1},
          "emotionalTones": ["tone1", "tone2", ...],
          "keyPhrases": [{"phrase": "text", "sentiment": "positive/negative/neutral"}]
        }
        
        Content to analyze:
        ${content.substring(0, 5000)}`
      }
    ],
    max_tokens: 1000,
    temperature: 0.3,
    response_format: { type: "json_object" }
  });
  
  const analysis = JSON.parse(completion.choices[0].message.content);
  
  res.json({
    ...analysis,
    usage: completion.usage
  });
});

/**
 * Analyze readability of content using AI
 * @route POST /api/ai/analyze/readability
 * @access Private
 */
exports.analyzeReadability = asyncHandler(async (req, res) => {
  const { content } = req.body;
  
  if (!content) {
    return res.status(400).json({ message: 'Content is required' });
  }
  
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: "You are a readability analysis expert who provides detailed insights on content complexity and accessibility."
      },
      {
        role: "user",
        content: `Analyze the readability of this content. Provide an approximate reading level, assess sentence complexity, vocabulary difficulty, and overall structure. Format your response as JSON with the following structure:
        {
          "readingLevel": "elementary/middle school/high school/college/graduate",
          "estimatedGradeLevel": {number},
          "averageSentenceLength": {number},
          "complexSentencesPercentage": {number},
          "vocabularyComplexity": "simple/moderate/advanced",
          "structureAssessment": "string",
          "suggestionsForImprovement": ["suggestion1", "suggestion2", ...]
        }
        
        Content to analyze:
        ${content.substring(0, 5000)}`
      }
    ],
    max_tokens: 1000,
    temperature: 0.3,
    response_format: { type: "json_object" }
  });
  
  const analysis = JSON.parse(completion.choices[0].message.content);
  
  res.json({
    ...analysis,
    usage: completion.usage
  });
});

/**
 * Extract keywords/tags from content using AI
 * @route POST /api/ai/analyze/keywords
 * @access Private
 */
exports.extractKeywords = asyncHandler(async (req, res) => {
  const { content, count = 10 } = req.body;
  
  if (!content) {
    return res.status(400).json({ message: 'Content is required' });
  }
  
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: "You are a keyword extraction specialist who identifies the most relevant tags and keywords from content."
      },
      {
        role: "user",
        content: `Extract the top ${count} most relevant keywords or phrases from this content. For each keyword/phrase, provide a relevance score from
        0-100 and a short explanation of why it's relevant. Format your response as JSON with the following structure:
        {
          "keywords": [
            {
              "keyword": "string",
              "relevanceScore": number,
              "explanation": "string"
            }
          ]
        }
        
        Content to analyze:
        ${content.substring(0, 5000)}`
      }
    ],
    max_tokens: 1000,
    temperature: 0.3,
    response_format: { type: "json_object" }
  });
  
  const analysis = JSON.parse(completion.choices[0].message.content);
  
  res.json({
    ...analysis,
    usage: completion.usage
  });
});

/**
 * Analyze image using AI
 * @route POST /api/ai/analyze/image
 * @access Private
 */
exports.analyzeImage = asyncHandler(async (req, res) => {
  const { imageUrl } = req.body;
  
  if (!imageUrl) {
    return res.status(400).json({ message: 'Image URL is required' });
  }
  
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: "You are an image analysis expert who provides detailed descriptions and analysis of images."
      },
      {
        role: "user",
        content: [
          { type: "text", text: "Provide a detailed analysis of this image. Include a description of what's in the image, the dominant colors, mood/tone, composition, and potential use cases for this image in content." },
          { type: "image_url", image_url: { url: imageUrl } }
        ]
      }
    ],
    max_tokens: 1000,
    temperature: 0.5
  });
  
  const analysis = completion.choices[0].message.content;
  
  res.json({
    analysis,
    usage: completion.usage
  });
});

/**
 * Generate tags for image using AI
 * @route POST /api/ai/analyze/image/tags
 * @access Private
 */
exports.generateImageTags = asyncHandler(async (req, res) => {
  const { imageUrl, count = 10 } = req.body;
  
  if (!imageUrl) {
    return res.status(400).json({ message: 'Image URL is required' });
  }
  
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: "You are an image tagging specialist who identifies relevant tags and keywords for images."
      },
      {
        role: "user",
        content: [
          { type: "text", text: `Generate the top ${count} most relevant tags for this image. Format your response as a JSON array of strings.` },
          { type: "image_url", image_url: { url: imageUrl } }
        ]
      }
    ],
    max_tokens: 300,
    temperature: 0.3,
    response_format: { type: "json_object" }
  });
  
  const tagsObj = JSON.parse(completion.choices[0].message.content);
  
  res.json({
    tags: tagsObj.tags || [],
    usage: completion.usage
  });
});

/**
 * Generate description for image using AI
 * @route POST /api/ai/analyze/image/description
 * @access Private
 */
exports.generateImageDescription = asyncHandler(async (req, res) => {
  const { imageUrl, length = 'medium' } = req.body;
  
  if (!imageUrl) {
    return res.status(400).json({ message: 'Image URL is required' });
  }
  
  const lengthMap = {
    'short': 'a brief caption (1-2 sentences)',
    'medium': 'a detailed description (3-5 sentences)',
    'long': 'a comprehensive description (2-3 paragraphs)'
  };
  
  const descriptionLength = lengthMap[length] || lengthMap['medium'];
  
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: "You are an image description specialist who creates engaging, accurate descriptions of images."
      },
      {
        role: "user",
        content: [
          { type: "text", text: `Generate ${descriptionLength} for this image that could be used as alt text or image description in a content management system.` },
          { type: "image_url", image_url: { url: imageUrl } }
        ]
      }
    ],
    max_tokens: 500,
    temperature: 0.6
  });
  
  const description = completion.choices[0].message.content;
  
  res.json({
    description,
    usage: completion.usage
  });
}); 