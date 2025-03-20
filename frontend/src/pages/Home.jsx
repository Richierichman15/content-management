import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useAuth } from '../context/AuthContext';

const Home = () => {
  const [recentContent, setRecentContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const fetchRecentContent = async () => {
      try {
        setError(null);
        // Add auth token if user is authenticated
        const headers = isAuthenticated ? {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        } : {};
        
        const response = await fetch('/api/content/published?limit=6', { headers });
        
        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        setRecentContent(data.data || []);
      } catch (error) {
        console.error('Error fetching recent content:', error);
        setError('Failed to load recent content');
      } finally {
        setLoading(false);
      }
    };

    fetchRecentContent();
  }, [isAuthenticated]);

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center py-12 px-4 sm:px-6 lg:px-8 bg-white rounded-lg shadow">
        <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl">
          AI-Enhanced Content Management
        </h1>
        <p className="mt-4 text-xl text-gray-500">
          Create, manage, and optimize your content with the power of artificial intelligence.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link
            to="/content/new"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Create Content
          </Link>
          <Link
            to="/content"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-indigo-600 bg-indigo-100 hover:bg-indigo-200"
          >
            Browse Content
          </Link>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <div className="p-6 border rounded-lg">
              <h3 className="text-lg font-medium text-gray-900">AI Content Generation</h3>
              <p className="mt-2 text-base text-gray-500">
                Generate high-quality content automatically using advanced AI models.
              </p>
            </div>
            <div className="p-6 border rounded-lg">
              <h3 className="text-lg font-medium text-gray-900">Smart SEO Optimization</h3>
              <p className="mt-2 text-base text-gray-500">
                Get AI-powered suggestions to improve your content's search engine visibility.
              </p>
            </div>
            <div className="p-6 border rounded-lg">
              <h3 className="text-lg font-medium text-gray-900">Media Management</h3>
              <p className="mt-2 text-base text-gray-500">
                Organize and optimize your media files with AI-powered tagging and categorization.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Content Section */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Recent Content</h2>
          {loading ? (
            <LoadingSpinner />
          ) : error ? (
            <p className="text-center text-red-500">{error}</p>
          ) : recentContent.length > 0 ? (
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {recentContent.map((content) => (
                <Link
                  key={content._id}
                  to={`/content/${content.slug}`}
                  className="block group"
                >
                  <div className="p-6 border rounded-lg transition-shadow hover:shadow-md">
                    {content.featuredImage && (
                      <img
                        src={content.featuredImage}
                        alt={content.title}
                        className="w-full h-48 object-cover rounded-md mb-4"
                      />
                    )}
                    <h3 className="text-lg font-medium text-gray-900 group-hover:text-indigo-600">
                      {content.title}
                    </h3>
                    <p className="mt-2 text-sm text-gray-500 line-clamp-2">
                      {content.excerpt}
                    </p>
                    <div className="mt-4 flex items-center text-sm text-gray-500">
                      <span>
                        {new Date(content.createdAt).toLocaleDateString()}
                      </span>
                      <span className="mx-2">•</span>
                      <span>{content.readingTime || '5'} min read</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500">No content available yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home; 