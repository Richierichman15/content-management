import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { TrashIcon } from '@heroicons/react/24/outline';

const MediaLibrary = () => {
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all'); // all, images, documents

  useEffect(() => {
    fetchMedia();
  }, [filter]);

  const fetchMedia = async () => {
    try {
      const response = await fetch(`/api/media?filter=${filter}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch media');
      }

      setMedia(data.data || []);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);

    try {
      const uploadPromises = files.map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/media/upload', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Failed to upload file');
        }

        return data.data;
      });

      const uploadedFiles = await Promise.all(uploadPromises);
      setMedia((prev) => [...uploadedFiles, ...prev]);
      toast.success(
        files.length === 1
          ? 'File uploaded successfully'
          : `${files.length} files uploaded successfully`
      );
    } catch (error) {
      toast.error(error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this file?')) {
      return;
    }

    try {
      const response = await fetch(`/api/media/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete file');
      }

      setMedia((prev) => prev.filter((item) => item._id !== id));
      toast.success('File deleted successfully');
    } catch (error) {
      toast.error(error.message);
    }
  };

  const filteredMedia = media.filter((item) =>
    item.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getFileIcon = (mimeType) => {
    if (mimeType.startsWith('image/')) {
      return null; // Will show actual image
    }
    if (mimeType.startsWith('video/')) {
      return '🎥';
    }
    if (mimeType.startsWith('audio/')) {
      return '🎵';
    }
    if (mimeType.includes('pdf')) {
      return '📄';
    }
    if (mimeType.includes('word')) {
      return '📝';
    }
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
      return '📊';
    }
    return '📁';
  };

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Media Library</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage your images, documents, and other media files
          </p>
        </div>
        <div>
          <label
            htmlFor="fileUpload"
            className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 cursor-pointer ${
              uploading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {uploading ? 'Uploading...' : 'Upload Files'}
            <input
              id="fileUpload"
              type="file"
              multiple
              onChange={handleUpload}
              className="hidden"
              disabled={uploading}
            />
          </label>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="sm:flex sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
            <div>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="all">All Files</option>
                <option value="images">Images</option>
                <option value="documents">Documents</option>
              </select>
            </div>
          </div>

          {loading ? (
            <LoadingSpinner />
          ) : (
            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {filteredMedia.map((item) => (
                <div
                  key={item._id}
                  className="group relative bg-white border rounded-lg overflow-hidden hover:shadow-md transition-shadow duration-200"
                >
                  <div className="aspect-w-1 aspect-h-1 bg-gray-200">
                    {item.mimeType.startsWith('image/') ? (
                      <img
                        src={item.url}
                        alt={item.filename}
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center text-4xl">
                        {getFileIcon(item.mimeType)}
                      </div>
                    )}
                  </div>
                  <div className="p-2">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {item.filename}
                    </p>
                    <p className="text-sm text-gray-500">
                      {(item.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <button
                      onClick={() => handleDelete(item._id)}
                      className="p-1 bg-red-100 rounded-full text-red-600 hover:bg-red-200"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && filteredMedia.length === 0 && (
            <div className="text-center py-12">
              <p className="text-sm text-gray-500">No media files found.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MediaLibrary; 