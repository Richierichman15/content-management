import { useState, useEffect, forwardRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ContentVersions from '../../components/content/ContentVersions';
import ContentSchedule from '../../components/content/ContentSchedule';
import ContentPreview from '../../components/content/ContentPreview';
import ContentTemplates from '../../components/content/ContentTemplates';
import AIAssistant from '../../components/content/AIAssistant';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { DocumentTextIcon, DocumentDuplicateIcon, EyeIcon, ClockIcon, ArrowPathIcon, SparklesIcon } from '@heroicons/react/24/outline';

// Add custom wrapper to fix ReactQuill findDOMNode warnings
const ReactQuillWrapper = forwardRef((props, ref) => {
  return <ReactQuill ref={ref} {...props} />;
});

ReactQuillWrapper.displayName = 'ReactQuillWrapper';

const ContentEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEditing = Boolean(id);

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [saveWithComment, setSaveWithComment] = useState(false);
  const [versionComment, setVersionComment] = useState('');
  const [scheduledPublish, setScheduledPublish] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [content, setContent] = useState({
    title: '',
    excerpt: '',
    content: '',
    featuredImage: '',
    status: 'draft',
    tags: [],
  });

  useEffect(() => {
    if (isEditing) {
      fetchContent();
    }
  }, [id]);

  const fetchContent = async () => {
    try {
      const response = await fetch(`/api/content/${id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch content');
      }

      setContent(data.data);
    } catch (error) {
      toast.error(error.message);
      navigate('/content');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const requestBody = {
        ...content,
      };
      
      // Add version comment if provided
      if (isEditing && saveWithComment && versionComment.trim()) {
        requestBody.versionComment = versionComment.trim();
      }

      const response = await fetch(
        isEditing ? `/api/content/${id}` : '/api/content',
        {
          method: isEditing ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify(requestBody),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to save content');
      }

      // Reset version comment after successful save
      setVersionComment('');
      setSaveWithComment(false);

      toast.success(
        isEditing ? 'Content updated successfully' : 'Content created successfully'
      );
      
      if (!isEditing) {
        navigate('/content');
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch('/api/media/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to upload image');
      }

      setContent((prev) => ({
        ...prev,
        featuredImage: data.data.url,
      }));

      toast.success('Image uploaded successfully');
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleTagsChange = (e) => {
    const tags = e.target.value.split(',').map((tag) => tag.trim());
    setContent((prev) => ({ ...prev, tags }));
  };

  const handleVersionRestore = (restoredContent) => {
    // Update the form with the restored content version
    setContent({
      ...restoredContent,
      // Ensure we keep any fields that might be missing in the restored version
      status: restoredContent.status || content.status,
      tags: restoredContent.tags || content.tags,
    });

    toast.info('Content restored from previous version. Click Save to apply changes.');
  };

  const handleScheduleUpdate = (scheduledDateTime) => {
    setScheduledPublish(scheduledDateTime);
    
    // When a schedule is set, automatically set status to "scheduled"
    if (scheduledDateTime && content.status === 'draft') {
      setContent(prev => ({
        ...prev,
        status: 'scheduled'
      }));
      toast.info('Content status set to "scheduled"');
    }
    
    // When a schedule is removed, set status back to draft if it was scheduled
    if (!scheduledDateTime && content.status === 'scheduled') {
      setContent(prev => ({
        ...prev,
        status: 'draft'
      }));
      toast.info('Content status reset to "draft"');
    }
  };

  const handleSelectTemplate = (template) => {
    setContent({
      title: '',
      content: template.content,
      excerpt: template.excerpt || '',
      featuredImage: template.featuredImage || '',
      status: 'draft',
      tags: template.tags || [],
    });
    setShowTemplates(false);
    toast.success('Template applied successfully');
  };

  // AI Assistant handlers
  const handleContentUpdate = (newContent) => {
    setContent(prev => ({
      ...prev,
      content: newContent
    }));
  };

  const handleExcerptUpdate = (newExcerpt) => {
    setContent(prev => ({
      ...prev,
      excerpt: newExcerpt
    }));
  };

  const handleTitleUpdate = (newTitle) => {
    setContent(prev => ({
      ...prev,
      title: newTitle
    }));
  };

  const handleTagsUpdate = (newTags) => {
    setContent(prev => ({
      ...prev,
      tags: newTags
    }));
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditing ? 'Edit Content' : 'Create New Content'}
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            {isEditing
              ? 'Update your existing content'
              : 'Create a new piece of content'}
          </p>
        </div>
        
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button
            type="button"
            onClick={() => setShowAIAssistant(!showAIAssistant)}
            className="inline-flex items-center px-4 py-2 border border-indigo-300 shadow-sm text-sm font-medium rounded-md text-indigo-700 bg-indigo-50 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <SparklesIcon className="-ml-1 mr-2 h-5 w-5 text-indigo-500" />
            AI Assistant
          </button>

          {!isEditing && (
            <button
              type="button"
              onClick={() => setShowTemplates(true)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <DocumentDuplicateIcon className="-ml-1 mr-2 h-5 w-5 text-gray-500" />
              Use Template
            </button>
          )}
          
          {isEditing && (
            <button
              type="button"
              onClick={() => setShowPreview(true)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <EyeIcon className="-ml-1 mr-2 h-5 w-5 text-gray-500" />
              Preview
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label
                      htmlFor="title"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Title
                    </label>
                    <input
                      type="text"
                      name="title"
                      id="title"
                      value={content.title}
                      onChange={(e) =>
                        setContent({ ...content, title: e.target.value })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="content"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Content
                    </label>
                    <div className="mt-1">
                      <ReactQuillWrapper
                        theme="snow"
                        value={content.content}
                        onChange={(value) =>
                          setContent({ ...content, content: value })
                        }
                        style={{ height: '300px', marginBottom: '50px' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="excerpt"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Excerpt
                    </label>
                    <textarea
                      id="excerpt"
                      name="excerpt"
                      rows={3}
                      value={content.excerpt}
                      onChange={(e) =>
                        setContent({ ...content, excerpt: e.target.value })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    ></textarea>
                  </div>

                  <div>
                    <label
                      htmlFor="featuredImage"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Featured Image
                    </label>
                    {content.featuredImage && (
                      <div className="mt-2 mb-4">
                        <img
                          src={content.featuredImage}
                          alt="Featured"
                          className="h-48 w-auto object-cover rounded-md"
                        />
                      </div>
                    )}
                    <input
                      type="file"
                      id="featuredImage"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="mt-1 block w-full text-sm text-gray-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-md file:border-0
                        file:text-sm file:font-medium
                        file:bg-indigo-50 file:text-indigo-700
                        hover:file:bg-indigo-100"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="tags"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Tags (comma separated)
                    </label>
                    <input
                      type="text"
                      name="tags"
                      id="tags"
                      value={content.tags.join(', ')}
                      onChange={handleTagsChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="status"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Status
                    </label>
                    <select
                      id="status"
                      name="status"
                      value={content.status}
                      onChange={(e) =>
                        setContent({ ...content, status: e.target.value })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    >
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>

                  {isEditing && (
                    <div className="flex items-center">
                      <input
                        id="saveWithComment"
                        name="saveWithComment"
                        type="checkbox"
                        checked={saveWithComment}
                        onChange={() => setSaveWithComment(!saveWithComment)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <label
                        htmlFor="saveWithComment"
                        className="ml-2 block text-sm text-gray-900"
                      >
                        Add version comment
                      </label>
                    </div>
                  )}

                  {isEditing && saveWithComment && (
                    <div>
                      <label
                        htmlFor="versionComment"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Version Comment
                      </label>
                      <input
                        type="text"
                        name="versionComment"
                        id="versionComment"
                        value={versionComment}
                        onChange={(e) => setVersionComment(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        placeholder="Describe what changed in this version"
                      />
                    </div>
                  )}
                </div>
              </div>
              <div className="px-4 py-3 bg-gray-50 text-right sm:px-6">
                <button
                  type="button"
                  onClick={() => navigate('/content')}
                  className="mr-3 inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {saving ? (
                    <ArrowPathIcon className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" />
                  ) : null}
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </form>
        </div>
        
        <div>
          {/* Show AI Assistant if toggled */}
          {showAIAssistant && (
            <AIAssistant 
              content={content}
              onContentUpdate={handleContentUpdate}
              onExcerptUpdate={handleExcerptUpdate}
              onTitleUpdate={handleTitleUpdate}
              onTagsUpdate={handleTagsUpdate}
            />
          )}
          
          {/* Version history for existing content */}
          {isEditing && (
            <ContentVersions
              contentId={id}
              onRestore={handleVersionRestore}
            />
          )}
          
          {/* Content scheduling */}
          {isEditing && (
            <ContentSchedule
              contentId={id}
              status={content.status}
              onScheduleUpdate={handleScheduleUpdate}
            />
          )}
        </div>
      </div>

      {/* Content preview modal */}
      {showPreview && (
        <ContentPreview
          content={content}
          onClose={() => setShowPreview(false)}
        />
      )}

      {/* Templates selection modal */}
      {showTemplates && (
        <ContentTemplates
          onSelect={handleSelectTemplate}
          onClose={() => setShowTemplates(false)}
        />
      )}
    </div>
  );
};

export default ContentEditor; 