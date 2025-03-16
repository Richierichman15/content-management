import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { toast } from 'react-toastify';
import ContentList from '../ContentList';
import { AuthProvider } from '../../../context/AuthContext';

// Mock the toast notifications
vi.mock('react-toastify', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockContent = [
  {
    _id: '1',
    title: 'Test Content 1',
    excerpt: 'Test excerpt 1',
    status: 'published',
    createdAt: '2024-03-20T00:00:00.000Z',
    updatedAt: '2024-03-20T00:00:00.000Z',
  },
  {
    _id: '2',
    title: 'Test Content 2',
    excerpt: 'Test excerpt 2',
    status: 'draft',
    createdAt: '2024-03-19T00:00:00.000Z',
    updatedAt: '2024-03-19T00:00:00.000Z',
  },
];

const renderWithRouter = (component) => {
  return render(
    <BrowserRouter>
      <AuthProvider>{component}</AuthProvider>
    </BrowserRouter>
  );
};

describe('ContentList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  it('renders loading state initially', () => {
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      })
    );

    renderWithRouter(<ContentList />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders content list after loading', async () => {
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: mockContent }),
      })
    );

    renderWithRouter(<ContentList />);

    await waitFor(() => {
      expect(screen.getByText('Test Content 1')).toBeInTheDocument();
      expect(screen.getByText('Test Content 2')).toBeInTheDocument();
    });
  });

  it('handles filter change', async () => {
    mockFetch
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockContent }),
        })
      )
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [mockContent[0]] }),
        })
      );

    renderWithRouter(<ContentList />);

    await waitFor(() => {
      expect(screen.getByText('Test Content 1')).toBeInTheDocument();
    });

    const filterSelect = screen.getByRole('combobox');
    fireEvent.change(filterSelect, { target: { value: 'published' } });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenLastCalledWith('/api/content?filter=published&sort=newest');
    });
  });

  it('handles delete content', async () => {
    mockFetch
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockContent }),
        })
      )
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ message: 'Content deleted' }),
        })
      )
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [mockContent[1]] }),
        })
      );

    // Mock window.confirm
    const confirmSpy = vi.spyOn(window, 'confirm');
    confirmSpy.mockImplementation(() => true);

    renderWithRouter(<ContentList />);

    await waitFor(() => {
      expect(screen.getByText('Test Content 1')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole('button');
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(toast.success).toHaveBeenCalledWith('Content deleted successfully');
    });

    confirmSpy.mockRestore();
  });

  it('handles error when fetching content', async () => {
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ message: 'Failed to fetch content' }),
      })
    );

    renderWithRouter(<ContentList />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to fetch content');
    });
  });
}); 