import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HomeIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

const NotFound = ({ message, redirectTimer = 0, redirectPath = '/' }) => {
  const navigate = useNavigate();

  useEffect(() => {
    // Auto-redirect after timer if specified
    if (redirectTimer > 0) {
      const timer = setTimeout(() => {
        navigate(redirectPath);
      }, redirectTimer * 1000);

      return () => clearTimeout(timer);
    }
  }, [navigate, redirectTimer, redirectPath]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full text-center">
        <div className="flex justify-center">
          <div className="h-24 w-24 text-indigo-500 flex items-center justify-center rounded-full bg-indigo-100">
            <span className="text-6xl font-bold">404</span>
          </div>
        </div>
        
        <h1 className="mt-6 text-3xl font-extrabold text-gray-900">
          {message || "Page Not Found"}
        </h1>
        
        <p className="mt-2 text-base text-gray-500">
          Sorry, we couldn't find the page you're looking for.
        </p>
        
        <div className="mt-10 space-y-4">
          <Link
            to="/"
            className="w-full flex items-center justify-center px-4 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <HomeIcon className="h-5 w-5 mr-2" />
            Go Home
          </Link>
          
          <button
            onClick={() => navigate(-1)}
            className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 shadow-sm text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Go Back
          </button>
        </div>
        
        {redirectTimer > 0 && (
          <p className="mt-8 text-sm text-gray-500">
            Redirecting to {redirectPath === '/' ? 'home' : redirectPath} in {redirectTimer} seconds...
          </p>
        )}
      </div>
    </div>
  );
};

export default NotFound; 