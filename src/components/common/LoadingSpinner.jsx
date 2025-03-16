const LoadingSpinner = () => {
  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <div
        role="status"
        className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"
      >
        <span className="sr-only">Loading...</span>
      </div>
    </div>
  );
};

export default LoadingSpinner; 