import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { FaSearch, FaTimes } from 'react-icons/fa';
import debounce from 'lodash/debounce';

const Search = ({
  onSearch,
  placeholder = 'Search...',
  debounceMs = 300,
  className = '',
}) => {
  const [value, setValue] = useState('');

  // Create debounced search function
  const debouncedSearch = React.useMemo(
    () =>
      debounce((searchValue) => {
        onSearch(searchValue);
      }, debounceMs),
    [onSearch, debounceMs]
  );

  // Update search when value changes
  useEffect(() => {
    debouncedSearch(value);
    return () => {
      debouncedSearch.cancel();
    };
  }, [value, debouncedSearch]);

  const handleChange = (e) => {
    setValue(e.target.value);
  };

  const handleClear = () => {
    setValue('');
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
        {value && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
          >
            <FaTimes />
          </button>
        )}
      </div>
    </div>
  );
};

Search.propTypes = {
  onSearch: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  debounceMs: PropTypes.number,
  className: PropTypes.string,
};

export default Search; 