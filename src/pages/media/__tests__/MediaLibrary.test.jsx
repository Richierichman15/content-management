import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { toast } from 'react-toastify';
import MediaLibrary from '../MediaLibrary';
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

const mockMedia = [
  {
    _id: '1',
    filename: 'test-image.jpg',
    mimeType: 'image/jpeg',
    url: 'http://example.com/test-image.jpg',
    size: 1024,
  },
  {
    _id: '2',
    filename: 'test-document.pdf',
    mimeType: 'application/pdf',
    url: 'http://example.com/test-document.pdf',
    size: 2048,
  },
];

const renderWithRouter = (component) => {
  return render(
    <BrowserRouter>
      <AuthProvider>{component}</AuthProvider>
    </BrowserRouter>
  );
};

describe('MediaLibrary', () => {
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

    renderWithRouter(<MediaLibrary />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders media list after loading', async () => {
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: mockMedia }),
      })
    );

    renderWithRouter(<MediaLibrary />);

    await waitFor(() => {
      expect(screen.getByText('test-image.jpg')).toBeInTheDocument();
      expect(screen.getByText('test-document.pdf')).toBeInTheDocument();
    });
  });

  it('handles file upload', async () => {
    const file = new File(['test'], 'test-upload.jpg', { type: 'image/jpeg' });

    mockFetch
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockMedia }),
        })
      )
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              data: {
                _id: '3',
                filename: 'test-upload.jpg',
                mimeType: 'image/jpeg',
                url: 'http://example.com/test-upload.jpg',
                size: 1024,
              },
            }),
        })
      )
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [...mockMedia] }),
        })
      );

    renderWithRouter(<MediaLibrary />);

    await waitFor(() => {
      expect(screen.getByText('test-image.jpg')).toBeInTheDocument();
    });

    const fileInput = screen.getByLabelText(/upload files/i);
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(toast.success).toHaveBeenCalledWith('File uploaded successfully');
    });
  });

  it('handles file deletion', async () => {
    mockFetch
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockMedia }),
        })
      )
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ message: 'File deleted' }),
        })
      )
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [mockMedia[1]] }),
        })
      );

    // Mock window.confirm
    const confirmSpy = vi.spyOn(window, 'confirm');
    confirmSpy.mockImplementation(() => true);

    renderWithRouter(<MediaLibrary />);

    await waitFor(() => {
      expect(screen.getByText('test-image.jpg')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole('button');
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(toast.success).toHaveBeenCalledWith('File deleted successfully');
    });

    confirmSpy.mockRestore();
  });

  it('handles filter change', async () => {
    mockFetch
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockMedia }),
        })
      )
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [mockMedia[0]] }),
        })
      );

    renderWithRouter(<MediaLibrary />);

    await waitFor(() => {
      expect(screen.getByText('test-image.jpg')).toBeInTheDocument();
    });

    const filterSelect = screen.getByRole('combobox');
    fireEvent.change(filterSelect, { target: { value: 'images' } });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenLastCalledWith('/api/media?filter=images');
    });
  });

  it('handles search functionality', async () => {
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: mockMedia }),
      })
    );

    renderWithRouter(<MediaLibrary />);

    await waitFor(() => {
      expect(screen.getByText('test-image.jpg')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search files/i);
    fireEvent.change(searchInput, { target: { value: 'document' } });

    await waitFor(() => {
      expect(screen.queryByText('test-image.jpg')).not.toBeInTheDocument();
      expect(screen.getByText('test-document.pdf')).toBeInTheDocument();
    });
  });

  it('handles error when fetching media', async () => {
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ message: 'Failed to fetch media' }),
      })
    );

    renderWithRouter(<MediaLibrary />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to fetch media');
    });
  });
}); 