import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import PropTypes from 'prop-types';
import { FaCloudUploadAlt, FaTimes } from 'react-icons/fa';

const MediaUpload = ({
  onUpload,
  onRemove,
  accept = {
    'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
    'application/pdf': ['.pdf'],
    'video/*': ['.mp4', '.webm'],
    'audio/*': ['.mp3', '.wav'],
  },
  maxSize = 5242880, // 5MB
  multiple = false,
  value,
  error,
}) => {
  const [preview, setPreview] = useState(value);

  const onDrop = useCallback(
    (acceptedFiles) => {
      const files = multiple ? acceptedFiles : [acceptedFiles[0]];
      onUpload(files);

      // Create preview URLs
      const previews = files.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
      }));
      setPreview(multiple ? previews : previews[0]);
    },
    [onUpload, multiple]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize,
    multiple,
  });

  const handleRemove = (fileToRemove) => {
    if (multiple) {
      const newPreview = preview.filter((item) => item.file !== fileToRemove);
      setPreview(newPreview);
      onRemove(fileToRemove);
    } else {
      setPreview(null);
      onRemove();
    }
  };

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${
            isDragActive
              ? 'border-indigo-500 bg-indigo-50'
              : 'border-gray-300 hover:border-indigo-500'
          }
          ${error ? 'border-red-500' : ''}`}
      >
        <input {...getInputProps()} />
        <FaCloudUploadAlt className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-sm text-gray-600">
          {isDragActive
            ? 'Drop the files here'
            : 'Drag and drop files here, or click to select files'}
        </p>
        <p className="mt-1 text-xs text-gray-500">
          Supported formats: Images, PDF, Video, Audio (max {maxSize / 1024 / 1024}MB)
        </p>
      </div>

      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}

      {preview && (
        <div className="mt-4">
          {multiple ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {preview.map((item) => (
                <div key={item.file.name} className="relative group">
                  <img
                    src={item.preview}
                    alt={item.file.name}
                    className="h-24 w-24 object-cover rounded-lg"
                  />
                  <button
                    onClick={() => handleRemove(item.file)}
                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <FaTimes className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="relative group">
              <img
                src={preview.preview}
                alt={preview.file.name}
                className="h-32 w-32 object-cover rounded-lg"
              />
              <button
                onClick={() => handleRemove()}
                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <FaTimes className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

MediaUpload.propTypes = {
  onUpload: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  accept: PropTypes.object,
  maxSize: PropTypes.number,
  multiple: PropTypes.bool,
  value: PropTypes.oneOfType([
    PropTypes.object,
    PropTypes.arrayOf(PropTypes.object),
  ]),
  error: PropTypes.string,
};

export default MediaUpload; 