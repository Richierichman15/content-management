import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { FaEdit, FaTrash } from 'react-icons/fa';

const ContentItem = ({ content, onDelete, showActions = true }) => {
  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this content?')) {
      onDelete(content.id);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-4 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">
            <Link to={`/content/${content.id}`} className="hover:text-blue-600">
              {content.title}
            </Link>
          </h3>
          <p className="text-gray-600 text-sm">
            {format(new Date(content.createdAt), 'PPP')} • {content.type}
          </p>
        </div>
        {showActions && (
          <div className="flex space-x-2">
            <Link
              to={`/content/edit/${content.id}`}
              className="text-blue-600 hover:text-blue-800 p-2"
              title="Edit"
            >
              <FaEdit />
            </Link>
            <button
              onClick={handleDelete}
              className="text-red-600 hover:text-red-800 p-2"
              title="Delete"
            >
              <FaTrash />
            </button>
          </div>
        )}
      </div>
      <div className="prose prose-sm max-w-none">
        <p className="text-gray-700 line-clamp-3">{content.description}</p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {content.tags?.map((tag) => (
          <span
            key={tag}
            className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full"
          >
            {tag}
          </span>
        ))}
      </div>
      <div className="mt-4 text-sm text-gray-500">
        <span>Status: </span>
        <span
          className={`font-medium ${
            content.status === 'published'
              ? 'text-green-600'
              : content.status === 'draft'
              ? 'text-yellow-600'
              : 'text-gray-600'
          }`}
        >
          {content.status.charAt(0).toUpperCase() + content.status.slice(1)}
        </span>
      </div>
    </div>
  );
};

ContentItem.propTypes = {
  content: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    description: PropTypes.string,
    type: PropTypes.string.isRequired,
    status: PropTypes.string.isRequired,
    tags: PropTypes.arrayOf(PropTypes.string),
    createdAt: PropTypes.string.isRequired,
  }).isRequired,
  onDelete: PropTypes.func,
  showActions: PropTypes.bool,
};

export default ContentItem; 