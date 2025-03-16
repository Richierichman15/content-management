import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ContentVersions from '../../components/content/ContentVersions';
import ContentSchedule from '../../components/content/ContentSchedule';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

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
                      required
                      value={content.title}
                      onChange={(e) =>
                        setContent((prev) => ({ ...prev, title: e.target.value }))
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
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
                        setContent((prev) => ({ ...prev, excerpt: e.target.value }))
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
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
                      <ReactQuill
                        theme="snow"
                        value={content.content}
                        onChange={(value) =>
                          setContent((prev) => ({ ...prev, content: value }))
                        }
                        className="h-64"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="featuredImage"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Featured Image
                    </label>
                    <div className="mt-1 flex items-center space-x-4">
                      {content.featuredImage && (
                        <img
                          src={content.featuredImage}
                          alt="Featured"
                          className="h-32 w-32 object-cover rounded-lg"
                        />
                      )}
                      <input
                        type="file"
                        id="featuredImage"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="tags"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Tags (comma-separated)
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
                        setContent((prev) => ({ ...prev, status: e.target.value }))
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    >
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                    </select>
                  </div>
                </div>
              </div>
              
              {isEditing && (
                <div className="px-4 py-3 bg-gray-50 text-right sm:px-6 border-t border-gray-200">
                  <div className="flex items-center justify-end space-x-3">
                    <div className="flex items-center">
                      <input
                        id="saveWithComment"
                        name="saveWithComment"
                        type="checkbox"
                        checked={saveWithComment}
                        onChange={(e) => setSaveWithComment(e.target.checked)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <label htmlFor="saveWithComment" className="ml-2 block text-sm text-gray-900">
                        Save as new version
                      </label>
                    </div>
                    
                    {saveWithComment && (
                      <input
                        type="text"
                        placeholder="Version comment (optional)"
                        value={versionComment}
                        onChange={(e) => setVersionComment(e.target.value)}
                        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-64 sm:text-sm border-gray-300 rounded-md"
                      />
                    )}
                    
                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              )}
              
              {!isEditing && (
                <div className="px-4 py-3 bg-gray-50 text-right sm:px-6 border-t border-gray-200">
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    {saving ? 'Creating...' : 'Create Content'}
                  </button>
                </div>
              )}
            </div>
          </form>
        </div>
        
        <div className="lg:col-span-1 space-y-6">
          <ContentSchedule 
            contentId={id} 
            currentStatus={content.status}
            onScheduleUpdate={handleScheduleUpdate}
            className="bg-white"
          />
          
          {isEditing && (
            <ContentVersions 
              contentId={id} 
              onVersionRestore={handleVersionRestore}
              className="bg-white"
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ContentEditor; 