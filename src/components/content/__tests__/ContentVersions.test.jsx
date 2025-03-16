import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ContentVersions from '../ContentVersions';
import { toast } from 'react-toastify';

// Mock toast
vi.mock('react-toastify', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockVersions = {
  versions: [
    {
      id: 'v3',
      createdAt: '2023-06-20T10:00:00Z',
      createdBy: 'John Doe',
      comment: 'Final revision',
      isLatest: true,
    },
    {
      id: 'v2',
      createdAt: '2023-06-19T14:30:00Z',
      createdBy: 'John Doe',
      comment: 'Added more details',
      isLatest: false,
    },
    {
      id: 'v1',
      createdAt: '2023-06-18T09:15:00Z',
      createdBy: null,
      comment: null,
      isLatest: false,
    },
  ],
};

describe('ContentVersions', () => {
  const mockOnVersionRestore = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  it('renders loading state initially', () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockVersions),
    });

    render(<ContentVersions contentId="123" onVersionRestore={mockOnVersionRestore} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('displays versions when loaded successfully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockVersions),
    });

    render(<ContentVersions contentId="123" onVersionRestore={mockOnVersionRestore} />);
    
    await waitFor(() => {
      expect(screen.getByText('Final revision')).toBeInTheDocument();
      expect(screen.getByText('Added more details')).toBeInTheDocument();
      expect(screen.getByText('Current')).toBeInTheDocument();
      expect(screen.getByText('Automatic save')).toBeInTheDocument();
    });
  });

  it('shows message when no versions are available', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ versions: [] }),
    });

    render(<ContentVersions contentId="123" onVersionRestore={mockOnVersionRestore} />);
    
    await waitFor(() => {
      expect(screen.getByText('No previous versions found.')).toBeInTheDocument();
    });
  });

  it('restores a version when restore button is clicked', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockVersions),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ content: { id: '123', title: 'Restored Content' } }),
      });

    render(<ContentVersions contentId="123" onVersionRestore={mockOnVersionRestore} />);
    
    await waitFor(() => {
      expect(screen.getAllByText('Restore')).toHaveLength(2);
    });

    // Click on the first Restore button (for the second version)
    const restoreButtons = screen.getAllByText('Restore');
    fireEvent.click(restoreButtons[0]);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/content/123/versions/v2/restore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      expect(toast.success).toHaveBeenCalledWith('Version restored successfully');
      expect(mockOnVersionRestore).toHaveBeenCalledWith({ id: '123', title: 'Restored Content' });
    });
  });

  it('handles errors when fetching versions', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      statusText: 'Not Found',
    });

    render(<ContentVersions contentId="123" onVersionRestore={mockOnVersionRestore} />);
    
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Error loading versions'));
    });
  });

  it('handles errors when restoring a version', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockVersions),
      })
      .mockResolvedValueOnce({
        ok: false,
        statusText: 'Server Error',
      });

    render(<ContentVersions contentId="123" onVersionRestore={mockOnVersionRestore} />);
    
    await waitFor(() => {
      expect(screen.getAllByText('Restore')).toHaveLength(2);
    });

    // Click on the first Restore button
    const restoreButtons = screen.getAllByText('Restore');
    fireEvent.click(restoreButtons[0]);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Error restoring version'));
    });
  });

  it('retries fetching versions when retry button is clicked', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        statusText: 'Network Error',
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockVersions),
      });

    render(<ContentVersions contentId="123" onVersionRestore={mockOnVersionRestore} />);
    
    await waitFor(() => {
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Retry'));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(screen.getByText('Final revision')).toBeInTheDocument();
    });
  });
}); 