import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon, PencilIcon, TrashIcon, EyeIcon } from '@heroicons/react/24/outline';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import ContentPreview from '../../components/content/ContentPreview';

const ContentList = () => {
  const [contents, setContents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, published, draft
  const [sortBy, setSortBy] = useState('newest'); // newest, oldest, title
  const [previewContent, setPreviewContent] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    fetchContents();
  }, [filter, sortBy]);

  const fetchContents = async () => {
    try {
      const response = await fetch(`/api/content?filter=${filter}&sort=${sortBy}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch content');
      }
      
      setContents(data.data || []);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this content?')) {
      return;
    }

    try {
      const response = await fetch(`/api/content/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete content');
      }

      toast.success('Content deleted successfully');
      fetchContents();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handlePreview = (contentId) => {
    setPreviewContent(contentId);
  };

  const closePreview = () => {
    setPreviewContent(null);
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Content Management</h1>
          <p className="mt-2 text-sm text-gray-700">
            Create, edit, and manage your content
          </p>
        </div>
        <Link
          to="/content/new"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
          New Content
        </Link>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="sm:flex sm:items-center sm:justify-between">
            <div className="sm:flex sm:items-center space-x-4">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              >
                <option value="all">All Content</option>
                <option value="published">Published</option>
                <option value="draft">Drafts</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="title">Title</option>
              </select>
            </div>
          </div>

          {loading ? (
            <LoadingSpinner />
          ) : (
            <div className="mt-8 flow-root">
              <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                  {contents.length > 0 ? (
                    <table className="min-w-full divide-y divide-gray-300">
                      <thead>
                        <tr>
                          <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">
                            Title
                          </th>
                          <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                            Status
                          </th>
                          <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                            Created
                          </th>
                          <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                            Last Updated
                          </th>
                          <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                            <span className="sr-only">Actions</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {contents.map((content) => (
                          <tr key={content._id}>
                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm">
                              <div className="flex items-center">
                                {content.featuredImage && (
                                  <img
                                    src={content.featuredImage}
                                    alt=""
                                    className="h-10 w-10 rounded-md object-cover mr-3"
                                  />
                                )}
                                <div>
                                  <div className="font-medium text-gray-900">
                                    {content.title}
                                  </div>
                                  <div className="text-gray-500">
                                    {content.excerpt?.substring(0, 100)}...
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm">
                              <span
                                className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getStatusBadgeClass(
                                  content.status
                                )}`}
                              >
                                {content.status}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              {new Date(content.createdAt).toLocaleDateString()}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              {new Date(content.updatedAt).toLocaleDateString()}
                            </td>
                            <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                              <div className="flex justify-end space-x-2">
                                <button
                                  onClick={() => handlePreview(content._id)}
                                  className="text-gray-600 hover:text-gray-900"
                                  aria-label="Preview content"
                                >
                                  <EyeIcon className="h-5 w-5" />
                                </button>
                                <Link
                                  to={`/content/edit/${content._id}`}
                                  className="text-indigo-600 hover:text-indigo-900"
                                >
                                  <PencilIcon className="h-5 w-5" />
                                </Link>
                                <button
                                  onClick={() => handleDelete(content._id)}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  <TrashIcon className="h-5 w-5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-sm text-gray-500">No content found.</p>
                      <Link
                        to="/content/new"
                        className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                      >
                        <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                        Create New Content
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {previewContent && (
        <ContentPreview 
          contentId={previewContent} 
          onClose={closePreview} 
        />
      )}
    </div>
  );
};

export default ContentList; 