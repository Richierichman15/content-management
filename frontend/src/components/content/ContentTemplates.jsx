import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { toast } from 'react-toastify';
import LoadingSpinner from '../common/LoadingSpinner';
import NetworkError from '../common/NetworkError';
import { DocumentTextIcon, DocumentDuplicateIcon, ChevronRightIcon, 
  AdjustmentsHorizontalIcon, TagIcon, CalendarIcon } from '@heroicons/react/24/outline';

const ContentTemplates = ({ onSelect, onClose }) => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const categories = [
    { id: 'all', name: 'All Templates' },
    { id: 'blog', name: 'Blog Posts' },
    { id: 'newsletter', name: 'Newsletters' },
    { id: 'social', name: 'Social Media' },
    { id: 'product', name: 'Product Pages' },
    { id: 'page', name: 'Website Pages' },
    { id: 'email', name: 'Email Content' },
    { id: 'other', name: 'Other' }
  ];

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/content/templates');
      if (!response.ok) {
        throw new Error(`Failed to load templates: ${response.statusText}`);
      }
      
      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (err) {
      setError(err.message);
      toast.error(`Error loading templates: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUseTemplate = (template) => {
    if (onSelect) {
      onSelect(template);
    }
  };

  const filteredTemplates = templates.filter(template => {
    // Filter by category
    if (selectedCategory !== 'all' && template.templateCategory !== selectedCategory) {
      return false;
    }
    
    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        template.title.toLowerCase().includes(searchLower) ||
        template.excerpt?.toLowerCase().includes(searchLower) ||
        template.tags?.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }
    
    return true;
  });

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-auto">
          <div className="text-center py-16">
            <LoadingSpinner />
            <p className="mt-4 text-gray-600 dark:text-gray-300">Loading templates...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-5xl w-full">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold dark:text-white">Content Templates</h2>
            <button
              onClick={onClose}
              className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-md px-3 py-1 text-sm"
            >
              Close
            </button>
          </div>
          <NetworkError error={error} onRetry={fetchTemplates} />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-auto">
        <div className="flex justify-between items-center mb-4 pb-4 border-b dark:border-gray-700">
          <h2 className="text-xl font-bold dark:text-white">Content Templates</h2>
          <button
            onClick={onClose}
            className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-md px-3 py-1 text-sm"
          >
            Close
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar/Categories */}
          <div className="lg:w-1/4">
            <div className="sticky top-0">
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Search templates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                Categories
              </h3>
              <nav className="space-y-1">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`
                      flex items-center px-3 py-2 w-full text-left rounded-md text-sm font-medium
                      ${selectedCategory === category.id 
                        ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-200' 
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}
                    `}
                  >
                    {selectedCategory === category.id && <ChevronRightIcon className="h-4 w-4 mr-1 flex-shrink-0" />}
                    {category.name}
                    <span className="ml-auto bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full px-2 py-0.5 text-xs">
                      {category.id === 'all' 
                        ? templates.length 
                        : templates.filter(t => t.templateCategory === category.id).length}
                    </span>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Templates Grid */}
          <div className="lg:w-3/4">
            {filteredTemplates.length === 0 ? (
              <div className="text-center py-10">
                <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No templates found</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Try changing your search or filter criteria.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredTemplates.map((template) => (
                  <div 
                    key={template._id}
                    className="border dark:border-gray-700 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                          {template.title}
                        </h3>
                        <span className="text-xs bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200 px-2 py-1 rounded capitalize">
                          {template.templateCategory}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                        {template.excerpt || "No description available."}
                      </p>
                      
                      <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 space-x-3 mb-3">
                        <div className="flex items-center">
                          <AdjustmentsHorizontalIcon className="h-3.5 w-3.5 mr-1" />
                          <span>{template.readingTime || '0'} min read</span>
                        </div>
                        
                        {template.tags && template.tags.length > 0 && (
                          <div className="flex items-center">
                            <TagIcon className="h-3.5 w-3.5 mr-1" />
                            <span>{template.tags.slice(0, 2).join(', ')}{template.tags.length > 2 ? '...' : ''}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center">
                          <CalendarIcon className="h-3.5 w-3.5 mr-1" />
                          <span>
                            {new Date(template.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handleUseTemplate(template)}
                        className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        <DocumentDuplicateIcon className="h-4 w-4 mr-1" />
                        Use This Template
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

ContentTemplates.propTypes = {
  onSelect: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default ContentTemplates; 