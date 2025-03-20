import { useState } from 'react';
import { toast } from 'react-toastify';
import { SparklesIcon, AcademicCapIcon, MagnifyingGlassIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

const AIAssistant = ({ content, onContentUpdate, onExcerptUpdate, onTitleUpdate, onTagsUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('generate');
  const [prompt, setPrompt] = useState('');
  const [selectedTitles, setSelectedTitles] = useState([]);
  const [showTitles, setShowTitles] = useState(false);
  const [showExcerpt, setShowExcerpt] = useState(false);
  const [generatedExcerpt, setGeneratedExcerpt] = useState('');
  const [analysisResult, setAnalysisResult] = useState(null);
  const [requestInProgress, setRequestInProgress] = useState(false);

  // Helper function to make API requests with proper error handling
  const makeApiRequest = async (url, body, successCallback, successMessage) => {
    if (requestInProgress) {
      toast.info('Please wait for the current request to complete');
      return;
    }
    
    try {
      setLoading(true);
      setRequestInProgress(true);
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Request failed with status ${response.status}`);
      }
      
      const data = await response.json();
      successCallback(data);
      
      if (successMessage) {
        toast.success(successMessage);
      }
      
      return data;
    } catch (error) {
      console.error(`API error for ${url}:`, error);
      toast.error(error.message || 'An error occurred');
      return null;
    } finally {
      setLoading(false);
      setRequestInProgress(false);
    }
  };

  // Generate content based on prompt
  const handleGenerateContent = async () => {
    if (!prompt.trim()) {
      toast.warning('Please enter a prompt for content generation');
      return;
    }

    const data = await makeApiRequest(
      '/api/ai/generate/text',
      {
        prompt,
        length: 500,
        tone: 'professional'
      },
      (data) => {
        onContentUpdate(data.generatedText);
        // After generating content, generate title suggestions
        generateTitleSuggestions(data.generatedText);
      },
      'Content generated successfully'
    );
  };

  // Generate title suggestions for the content
  const generateTitleSuggestions = async (contentText) => {
    await makeApiRequest(
      '/api/ai/generate/title',
      {
        content: contentText || content.content,
        count: 5
      },
      (data) => {
        setSelectedTitles(data.titles);
        setShowTitles(true);
      }
    );
  };

  // Apply selected title
  const applyTitle = (title) => {
    onTitleUpdate(title);
    setShowTitles(false);
    toast.success('Title applied');
  };

  // Generate excerpt
  const generateExcerpt = async () => {
    if (!content.content) {
      toast.warning('Please enter some content first');
      return;
    }

    await makeApiRequest(
      '/api/ai/generate/excerpt',
      {
        content: content.content,
        length: 150
      },
      (data) => {
        setGeneratedExcerpt(data.excerpt);
        setShowExcerpt(true);
      }
    );
  };

  // Apply generated excerpt
  const applyExcerpt = () => {
    onExcerptUpdate(generatedExcerpt);
    setShowExcerpt(false);
    toast.success('Excerpt applied');
  };

  // Enhance content with SEO
  const enhanceContentSEO = async () => {
    if (!content.content) {
      toast.warning('Please enter some content first');
      return;
    }

    await makeApiRequest(
      '/api/ai/enhance/seo',
      {
        content: content.content,
        keywords: content.tags
      },
      (data) => onContentUpdate(data.enhancedContent),
      'Content enhanced for SEO'
    );
  };

  // Improve content readability
  const improveReadability = async () => {
    if (!content.content) {
      toast.warning('Please enter some content first');
      return;
    }

    await makeApiRequest(
      '/api/ai/enhance/readability',
      {
        content: content.content,
        targetLevel: 'general'
      },
      (data) => onContentUpdate(data.enhancedContent),
      'Content readability improved'
    );
  };

  // Fix grammar and spelling
  const fixGrammar = async () => {
    if (!content.content) {
      toast.warning('Please enter some content first');
      return;
    }

    await makeApiRequest(
      '/api/ai/enhance/grammar',
      { content: content.content },
      (data) => onContentUpdate(data.enhancedContent),
      'Grammar and spelling corrected'
    );
  };

  // Analyze content and extract insights
  const analyzeContent = async () => {
    if (!content.content) {
      toast.warning('Please enter some content first');
      return;
    }

    await makeApiRequest(
      '/api/ai/analyze/content',
      { content: content.content },
      (data) => {
        setAnalysisResult(data.analysis);
        setActiveTab('analyze');
      }
    );
  };

  // Extract keywords and tags
  const extractKeywords = async () => {
    if (!content.content) {
      toast.warning('Please enter some content first');
      return;
    }

    await makeApiRequest(
      '/api/ai/analyze/keywords',
      {
        content: content.content,
        count: 10
      },
      (data) => onTagsUpdate(data.keywords.map(k => k.keyword)),
      'Keywords extracted and added as tags'
    );
  };

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
          <SparklesIcon className="h-5 w-5 mr-2 text-indigo-500" />
          AI Assistant
        </h3>
        
        <div className="mt-4 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 overflow-x-auto">
            <button
              className={`${
                activeTab === 'generate'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm focus:outline-none transition`}
              onClick={() => setActiveTab('generate')}
              disabled={loading}
            >
              Generate
            </button>
            <button
              className={`${
                activeTab === 'enhance'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm focus:outline-none transition`}
              onClick={() => setActiveTab('enhance')}
              disabled={loading}
            >
              Enhance
            </button>
            <button
              className={`${
                activeTab === 'analyze'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm focus:outline-none transition`}
              onClick={() => setActiveTab('analyze')}
              disabled={loading}
            >
              Analyze
            </button>
          </nav>
        </div>

        {loading && (
          <div className="absolute inset-0 bg-white bg-opacity-60 flex items-center justify-center z-10">
            <div className="flex flex-col items-center">
              <ArrowPathIcon className="h-8 w-8 text-indigo-500 animate-spin" />
              <p className="mt-2 text-sm text-gray-600">AI is working on your content...</p>
            </div>
          </div>
        )}

        <div className="mt-4 relative">
          {activeTab === 'generate' && (
            <div className="space-y-4">
              <div>
                <label htmlFor="prompt" className="block text-sm font-medium text-gray-700">
                  Enter a prompt to generate content
                </label>
                <div className="mt-1">
                  <textarea
                    id="prompt"
                    rows={3}
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    placeholder="Write about benefits of using AI in content management..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    disabled={loading}
                  ></textarea>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleGenerateContent}
                  disabled={loading || !prompt.trim()}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition"
                >
                  {loading ? (
                    <>
                      <ArrowPathIcon className="animate-spin -ml-1 mr-2 h-4 w-4" />
                      Generating...
                    </>
                  ) : (
                    'Generate Content'
                  )}
                </button>
                
                <button
                  type="button"
                  onClick={() => generateTitleSuggestions()}
                  disabled={loading || !content.content}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition"
                >
                  Suggest Titles
                </button>
                
                <button
                  type="button"
                  onClick={generateExcerpt}
                  disabled={loading || !content.content}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition"
                >
                  Generate Excerpt
                </button>
              </div>
              
              {/* Title suggestions */}
              {showTitles && selectedTitles.length > 0 && (
                <div className="mt-4 p-4 bg-gray-50 rounded-md">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Title Suggestions</h4>
                  <ul className="space-y-2">
                    {selectedTitles.map((title, index) => (
                      <li key={index} className="flex justify-between items-center">
                        <span className="text-sm text-gray-700">{title}</span>
                        <button
                          type="button"
                          onClick={() => applyTitle(title)}
                          className="text-xs text-indigo-600 hover:text-indigo-900 transition"
                        >
                          Use
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Excerpt suggestion */}
              {showExcerpt && generatedExcerpt && (
                <div className="mt-4 p-4 bg-gray-50 rounded-md">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Generated Excerpt</h4>
                  <p className="text-sm text-gray-700 mb-2">{generatedExcerpt}</p>
                  <button
                    type="button"
                    onClick={applyExcerpt}
                    className="text-xs text-indigo-600 hover:text-indigo-900 transition"
                  >
                    Use This Excerpt
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'enhance' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                Improve your content with AI assistance. Select an enhancement option below.
              </p>
              
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={enhanceContentSEO}
                  disabled={loading || !content.content}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition"
                >
                  Optimize for SEO
                </button>
                
                <button
                  type="button"
                  onClick={improveReadability}
                  disabled={loading || !content.content}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition"
                >
                  Improve Readability
                </button>
                
                <button
                  type="button"
                  onClick={fixGrammar}
                  disabled={loading || !content.content}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition"
                >
                  Fix Grammar & Spelling
                </button>
              </div>
            </div>
          )}

          {activeTab === 'analyze' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                Analyze your content for insights and improvements.
              </p>
              
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={analyzeContent}
                  disabled={loading || !content.content}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition"
                >
                  <AcademicCapIcon className="-ml-1 mr-2 h-4 w-4" />
                  Content Analysis
                </button>
                
                <button
                  type="button"
                  onClick={extractKeywords}
                  disabled={loading || !content.content}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition"
                >
                  <MagnifyingGlassIcon className="-ml-1 mr-2 h-4 w-4" />
                  Extract Keywords
                </button>
              </div>
              
              {/* Analysis results */}
              {analysisResult && (
                <div className="mt-4 p-4 bg-gray-50 rounded-md">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Content Analysis</h4>
                  <div className="prose prose-sm max-w-none text-gray-700">
                    <div dangerouslySetInnerHTML={{ __html: analysisResult.replace(/\n/g, '<br>') }} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIAssistant; 