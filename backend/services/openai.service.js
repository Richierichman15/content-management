const { OpenAI } = require('openai');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const config = require('../config/config');

/**
 * Service to handle OpenAI API interactions
 */
class OpenAIService {
  constructor() {
    this.client = new OpenAI({
      apiKey: config.openai.apiKey
    });
  }

  /**
   * Analyze an image using OpenAI Vision API
   * @param {string} imageUrl - URL of the image to analyze
   * @returns {Promise<Object>} Analysis results
   */
  async analyzeImage(imageUrl) {
    try {
      // Check if the image URL is remote or local
      let imageData;
      
      if (imageUrl.startsWith('http')) {
        // Remote URL - download the image as a buffer
        const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        imageData = Buffer.from(response.data, 'binary').toString('base64');
      } else {
        // Local path - read the file
        const imagePath = imageUrl.startsWith('/') 
          ? path.join(process.cwd(), 'public', imageUrl.substring(1)) 
          : path.join(process.cwd(), imageUrl);
        
        const buffer = await fs.readFile(imagePath);
        imageData = buffer.toString('base64');
      }
      
      // Send to OpenAI Vision API
      const prompt = `
      Please analyze this image and provide the following information:
      1. A detailed description of what's in the image
      2. A concise alt text for accessibility (roughly 15-20 words)
      3. A list of relevant tags or keywords (at least 10)
      
      Format your response as a JSON object with the following keys:
      - description (string)
      - accessibilityText (string)
      - tags (array of strings)
      `;
      
      const response = await this.client.chat.completions.create({
        model: 'gpt-4-vision-preview',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${imageData}`
                }
              }
            ]
          }
        ],
        max_tokens: 500
      });
      
      // Extract the response
      const content = response.choices[0].message.content;
      
      // Parse the JSON response
      let parsedResponse;
      try {
        // Find JSON in the response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedResponse = JSON.parse(jsonMatch[0]);
        } else {
          // If no JSON found, create a structured object from the text
          parsedResponse = this.parseUnstructuredResponse(content);
        }
      } catch (parseError) {
        console.error('Error parsing OpenAI response:', parseError);
        // If parsing fails, create a structured object from the text
        parsedResponse = this.parseUnstructuredResponse(content);
      }
      
      return {
        description: parsedResponse.description || '',
        accessibilityText: parsedResponse.accessibilityText || '',
        tags: parsedResponse.tags || []
      };
    } catch (error) {
      console.error('OpenAI Vision API error:', error);
      return null;
    }
  }
  
  /**
   * Parse unstructured text response from OpenAI into structured format
   * @param {string} text - The text response
   * @returns {Object} Structured response
   */
  parseUnstructuredResponse(text) {
    // Default structure
    const result = {
      description: '',
      accessibilityText: '',
      tags: []
    };
    
    // Extract description
    const descriptionMatch = text.match(/description:?(.*?)(?=accessibility|alt text|tags:|$)/is);
    if (descriptionMatch && descriptionMatch[1]) {
      result.description = descriptionMatch[1].trim();
    }
    
    // Extract accessibility text
    const accessibilityMatch = text.match(/(?:accessibility|alt text):?(.*?)(?=description:|tags:|$)/is);
    if (accessibilityMatch && accessibilityMatch[1]) {
      result.accessibilityText = accessibilityMatch[1].trim();
    }
    
    // Extract tags
    const tagsMatch = text.match(/tags:?(.*?)(?=description:|accessibility:|alt text:|$)/is);
    if (tagsMatch && tagsMatch[1]) {
      // Split by commas, hyphens, or newlines
      const tagText = tagsMatch[1].trim();
      result.tags = tagText
        .split(/,|\n|-|\*/)
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);
    }
    
    return result;
  }
  
  /**
   * Generate AI-enhanced content ideas based on a topic
   * @param {string} topic - The topic to generate ideas for
   * @returns {Promise<Array>} List of content ideas
   */
  async generateContentIdeas(topic) {
    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a creative content strategist helping to generate unique content ideas.'
          },
          {
            role: 'user',
            content: `Generate 5 creative content ideas related to: ${topic}. For each idea, provide a title, brief description, and 3 key points to cover.`
          }
        ],
        max_tokens: 800
      });
      
      return {
        ideas: response.choices[0].message.content,
        topic
      };
    } catch (error) {
      console.error('OpenAI content generation error:', error);
      return {
        ideas: [],
        error: 'Failed to generate content ideas'
      };
    }
  }
}

// Create singleton instance
const openaiService = new OpenAIService();

module.exports = openaiService; 