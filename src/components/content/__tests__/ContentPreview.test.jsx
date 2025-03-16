import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import ContentPreview from '../ContentPreview';
import { toast } from 'react-toastify';

// Mock toast
vi.mock('react-toastify', () => ({
  toast: {
    error: vi.fn(),
  },
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockContent = {
  id: '1',
  title: 'Test Content Title',
  content: '<p>This is test content</p>',
  author: 'John Doe',
  createdAt: '2023-06-15T12:00:00Z',
  status: 'Draft',
  category: 'Technology',
  tags: ['react', 'javascript'],
  featuredImage: 'https://example.com/image.jpg',
};

describe('ContentPreview', () => {
  const onCloseMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  it('renders loading state initially', () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockContent),
    });

    render(<ContentPreview contentId="1" onClose={onCloseMock} />);
    expect(screen.getByText('Loading content preview...')).toBeInTheDocument();
  });

  it('displays content when loaded successfully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockContent),
    });

    render(<ContentPreview contentId="1" onClose={onCloseMock} />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Content Title')).toBeInTheDocument();
      expect(screen.getByText(/This is test content/)).toBeInTheDocument();
      expect(screen.getByText('By John Doe')).toBeInTheDocument();
      expect(screen.getByText('Technology')).toBeInTheDocument();
      expect(screen.getByText('#react')).toBeInTheDocument();
      expect(screen.getByText('#javascript')).toBeInTheDocument();
      expect(screen.getByAltText('Test Content Title')).toHaveAttribute('src', 'https://example.com/image.jpg');
    });
  });

  it('displays error message when content fails to load', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      statusText: 'Not Found',
    });

    render(<ContentPreview contentId="1" onClose={onCloseMock} />);
    
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Error loading preview'));
    });
  });

  it('calls onClose when close button is clicked', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockContent),
    });

    render(<ContentPreview contentId="1" onClose={onCloseMock} />);
    
    await waitFor(() => {
      expect(screen.getByText('Close')).toBeInTheDocument();
    });

    screen.getByText('Close').click();
    expect(onCloseMock).toHaveBeenCalled();
  });

  it('shows content status', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockContent),
    });

    render(<ContentPreview contentId="1" onClose={onCloseMock} />);
    
    await waitFor(() => {
      expect(screen.getByText('Draft')).toBeInTheDocument();
    });
  });
}); 