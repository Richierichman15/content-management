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

  // Generate content based on prompt
  const handleGenerateContent = async () => {
    if (!prompt.trim()) {
      toast.warning('Please enter a prompt for content generation');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/ai/generate/text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          prompt,
          length: 500,
          tone: 'professional'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate content');
      }

      const data = await response.json();
      onContentUpdate(data.generatedText);
      toast.success('Content generated successfully');
      
      // After generating content, generate title suggestions
      generateTitleSuggestions(data.generatedText);
    } catch (error) {
      toast.error(error.message || 'Error generating content');
    } finally {
      setLoading(false);
    }
  };

  // Generate title suggestions for the content
  const generateTitleSuggestions = async (contentText) => {
    setLoading(true);
    try {
      const response = await fetch('/api/ai/generate/title', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          content: contentText || content.content,
          count: 5
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate title suggestions');
      }

      const data = await response.json();
      setSelectedTitles(data.titles);
      setShowTitles(true);
    } catch (error) {
      toast.error(error.message || 'Error generating title suggestions');
    } finally {
      setLoading(false);
    }
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

    setLoading(true);
    try {
      const response = await fetch('/api/ai/generate/excerpt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          content: content.content,
          length: 150
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate excerpt');
      }

      const data = await response.json();
      setGeneratedExcerpt(data.excerpt);
      setShowExcerpt(true);
    } catch (error) {
      toast.error(error.message || 'Error generating excerpt');
    } finally {
      setLoading(false);
    }
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

    setLoading(true);
    try {
      const response = await fetch('/api/ai/enhance/seo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          content: content.content,
          keywords: content.tags
        })
      });

      if (!response.ok) {
        throw new Error('Failed to enhance content');
      }

      const data = await response.json();
      onContentUpdate(data.enhancedContent);
      toast.success('Content enhanced for SEO');
    } catch (error) {
      toast.error(error.message || 'Error enhancing content');
    } finally {
      setLoading(false);
    }
  };

  // Improve content readability
  const improveReadability = async () => {
    if (!content.content) {
      toast.warning('Please enter some content first');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/ai/enhance/readability', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          content: content.content,
          targetLevel: 'general'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to improve readability');
      }

      const data = await response.json();
      onContentUpdate(data.enhancedContent);
      toast.success('Content readability improved');
    } catch (error) {
      toast.error(error.message || 'Error improving readability');
    } finally {
      setLoading(false);
    }
  };

  // Fix grammar and spelling
  const fixGrammar = async () => {
    if (!content.content) {
      toast.warning('Please enter some content first');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/ai/enhance/grammar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          content: content.content
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fix grammar');
      }

      const data = await response.json();
      onContentUpdate(data.enhancedContent);
      toast.success('Grammar and spelling corrected');
    } catch (error) {
      toast.error(error.message || 'Error fixing grammar');
    } finally {
      setLoading(false);
    }
  };

  // Analyze content and extract insights
  const analyzeContent = async () => {
    if (!content.content) {
      toast.warning('Please enter some content first');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/ai/analyze/content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          content: content.content
        })
      });

      if (!response.ok) {
        throw new Error('Failed to analyze content');
      }

      const data = await response.json();
      setAnalysisResult(data.analysis);
      setActiveTab('analyze');
    } catch (error) {
      toast.error(error.message || 'Error analyzing content');
    } finally {
      setLoading(false);
    }
  };

  // Extract keywords and tags
  const extractKeywords = async () => {
    if (!content.content) {
      toast.warning('Please enter some content first');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/ai/analyze/keywords', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          content: content.content,
          count: 10
        })
      });

      if (!response.ok) {
        throw new Error('Failed to extract keywords');
      }

      const data = await response.json();
      const keywords = data.keywords.map(k => k.keyword);
      onTagsUpdate(keywords);
      toast.success('Keywords extracted and added as tags');
    } catch (error) {
      toast.error(error.message || 'Error extracting keywords');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
          <SparklesIcon className="h-5 w-5 mr-2 text-indigo-500" />
          AI Assistant
        </h3>
        
        <div className="mt-4 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              className={`${
                activeTab === 'generate'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm`}
              onClick={() => setActiveTab('generate')}
            >
              Generate
            </button>
            <button
              className={`${
                activeTab === 'enhance'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm`}
              onClick={() => setActiveTab('enhance')}
            >
              Enhance
            </button>
            <button
              className={`${
                activeTab === 'analyze'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm`}
              onClick={() => setActiveTab('analyze')}
            >
              Analyze
            </button>
          </nav>
        </div>

        <div className="mt-4">
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
                  ></textarea>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleGenerateContent}
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {loading ? 'Generating...' : 'Generate Content'}
                </button>
                
                <button
                  type="button"
                  onClick={() => generateTitleSuggestions()}
                  disabled={loading || !content.content}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  Suggest Titles
                </button>
                
                <button
                  type="button"
                  onClick={generateExcerpt}
                  disabled={loading || !content.content}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
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
                          className="text-xs text-indigo-600 hover:text-indigo-900"
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
                    className="text-xs text-indigo-600 hover:text-indigo-900"
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
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  Optimize for SEO
                </button>
                
                <button
                  type="button"
                  onClick={improveReadability}
                  disabled={loading || !content.content}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  Improve Readability
                </button>
                
                <button
                  type="button"
                  onClick={fixGrammar}
                  disabled={loading || !content.content}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  Fix Grammar & Spelling
                </button>
              </div>
              
              {loading && (
                <div className="flex justify-center my-4">
                  <ArrowPathIcon className="h-5 w-5 text-indigo-500 animate-spin" />
                  <span className="ml-2 text-sm text-gray-600">Enhancing content...</span>
                </div>
              )}
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
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  <AcademicCapIcon className="-ml-1 mr-2 h-4 w-4" />
                  Content Analysis
                </button>
                
                <button
                  type="button"
                  onClick={extractKeywords}
                  disabled={loading || !content.content}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  <MagnifyingGlassIcon className="-ml-1 mr-2 h-4 w-4" />
                  Extract Keywords
                </button>
              </div>
              
              {loading && (
                <div className="flex justify-center my-4">
                  <ArrowPathIcon className="h-5 w-5 text-indigo-500 animate-spin" />
                  <span className="ml-2 text-sm text-gray-600">Analyzing content...</span>
                </div>
              )}
              
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