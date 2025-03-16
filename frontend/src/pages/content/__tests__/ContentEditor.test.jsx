import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { toast } from 'react-toastify';
import ContentEditor from '../ContentEditor';
import { AuthProvider } from '../../../context/AuthContext';

// Mock react-router hooks
vi.mock('react-router-dom', () => ({
  ...vi.importActual('react-router-dom'),
  useParams: () => ({ id: '123' }),
  useNavigate: () => vi.fn(),
}));

// Mock ContentVersions component
vi.mock('../../../components/content/ContentVersions', () => ({
  default: ({ contentId, onVersionRestore }) => (
    <div data-testid="content-versions">
      <span>Versions for content ID: {contentId}</span>
      <button 
        onClick={() => onVersionRestore({ 
          id: '123', 
          title: 'Restored Title', 
          content: '<p>Restored content</p>',
          excerpt: 'Restored excerpt',
        })}
      >
        Restore Version
      </button>
    </div>
  ),
}));

// Mock ContentSchedule component
vi.mock('../../../components/content/ContentSchedule', () => ({
  default: ({ contentId, currentStatus, onScheduleUpdate }) => (
    <div data-testid="content-schedule">
      <span>Schedule for content ID: {contentId}</span>
      <span>Current status: {currentStatus}</span>
      <button 
        onClick={() => onScheduleUpdate('2023-12-31T15:00:00')}
        data-testid="schedule-button"
      >
        Schedule Content
      </button>
      <button 
        onClick={() => onScheduleUpdate(null)}
        data-testid="cancel-schedule-button"
      >
        Cancel Schedule
      </button>
    </div>
  ),
}));

// Mock ReactQuill
vi.mock('react-quill', () => ({
  default: ({ value, onChange }) => (
    <div data-testid="react-quill">
      <textarea 
        data-testid="quill-editor"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  ),
}));

// Mock the toast notifications
vi.mock('react-toastify', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockContent = {
  data: {
    _id: '123',
    title: 'Test Content',
    excerpt: 'Test excerpt',
    content: '<p>Test content</p>',
    featuredImage: 'https://example.com/image.jpg',
    status: 'draft',
    tags: ['test', 'content'],
  },
};

const renderWithRouter = (component) => {
  return render(
    <BrowserRouter>
      <AuthProvider>{component}</AuthProvider>
    </BrowserRouter>
  );
};

describe('ContentEditor (Edit Mode)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    // Mock fetch for initial content load
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockContent),
    });
  });

  it('loads content in edit mode', async () => {
    renderWithRouter(<ContentEditor />);
    
    // Should show loading first
    expect(screen.getByRole('status')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Content')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test excerpt')).toBeInTheDocument();
      expect(screen.getByTestId('content-versions')).toBeInTheDocument();
    });
  });

  it('shows versioning UI in edit mode', async () => {
    renderWithRouter(<ContentEditor />);
    
    await waitFor(() => {
      expect(screen.getByLabelText('Save as new version')).toBeInTheDocument();
      expect(screen.getByText('Versions for content ID: 123')).toBeInTheDocument();
    });
    
    // Click the checkbox to enable version comment
    fireEvent.click(screen.getByLabelText('Save as new version'));
    expect(screen.getByPlaceholderText('Version comment (optional)')).toBeInTheDocument();
  });

  it('restores content from a previous version', async () => {
    renderWithRouter(<ContentEditor />);
    
    await waitFor(() => {
      expect(screen.getByText('Restore Version')).toBeInTheDocument();
    });
    
    // Click restore version button
    fireEvent.click(screen.getByText('Restore Version'));
    
    // Check if content was updated with restored version
    expect(screen.getByDisplayValue('Restored Title')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Restored excerpt')).toBeInTheDocument();
    expect(toast.info).toHaveBeenCalledWith('Content restored from previous version. Click Save to apply changes.');
  });

  it('submits form with version comment when specified', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockContent),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ message: 'Content updated' }),
      });
      
    renderWithRouter(<ContentEditor />);
    
    await waitFor(() => {
      expect(screen.getByText('Save')).toBeInTheDocument();
    });
    
    // Enable version comment and enter a comment
    fireEvent.click(screen.getByLabelText('Save as new version'));
    fireEvent.change(screen.getByPlaceholderText('Version comment (optional)'), {
      target: { value: 'Updated layout and content' },
    });
    
    // Submit the form
    fireEvent.click(screen.getByText('Save'));
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/content/123', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': expect.any(String),
        },
        body: expect.stringContaining('"versionComment":"Updated layout and content"'),
      });
      expect(toast.success).toHaveBeenCalledWith('Content updated successfully');
    });
  });

  it('displays schedule component with proper status', async () => {
    renderWithRouter(<ContentEditor />);
    
    await waitFor(() => {
      expect(screen.getByTestId('content-schedule')).toBeInTheDocument();
      expect(screen.getByText('Schedule for content ID: 123')).toBeInTheDocument();
      expect(screen.getByText('Current status: draft')).toBeInTheDocument();
    });
  });

  it('updates content status when scheduling', async () => {
    renderWithRouter(<ContentEditor />);
    
    await waitFor(() => {
      expect(screen.getByTestId('schedule-button')).toBeInTheDocument();
    });
    
    // Click to schedule content
    fireEvent.click(screen.getByTestId('schedule-button'));
    
    await waitFor(() => {
      expect(toast.info).toHaveBeenCalledWith('Content status set to "scheduled"');
      expect(screen.getByText('Current status: scheduled')).toBeInTheDocument();
    });
  });

  it('resets content status when cancelling schedule', async () => {
    renderWithRouter(<ContentEditor />);
    
    await waitFor(() => {
      expect(screen.getByTestId('schedule-button')).toBeInTheDocument();
    });
    
    // First schedule the content
    fireEvent.click(screen.getByTestId('schedule-button'));
    
    await waitFor(() => {
      expect(screen.getByText('Current status: scheduled')).toBeInTheDocument();
    });
    
    // Then cancel the schedule
    fireEvent.click(screen.getByTestId('cancel-schedule-button'));
    
    await waitFor(() => {
      expect(toast.info).toHaveBeenCalledWith('Content status reset to "draft"');
      expect(screen.getByText('Current status: draft')).toBeInTheDocument();
    });
  });
});

describe('ContentEditor (Create Mode)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    
    // Mock for empty ID
    vi.mocked(useParams).mockReturnValue({ id: undefined });
  });

  it('renders in create mode without versions', () => {
    renderWithRouter(<ContentEditor />);
    
    expect(screen.queryByTestId('content-versions')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Save as new version')).not.toBeInTheDocument();
    expect(screen.getByText('Create Content')).toBeInTheDocument();
  });

  it('creates new content successfully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ message: 'Content created' }),
    });

    renderWithRouter(<ContentEditor />);
    
    // Fill form fields
    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'New Content' },
    });
    
    fireEvent.change(screen.getByLabelText('Excerpt'), {
      target: { value: 'New excerpt' },
    });
    
    // Submit the form
    fireEvent.click(screen.getByText('Create Content'));
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': expect.any(String),
        },
        body: expect.stringContaining('"title":"New Content"'),
      });
      expect(toast.success).toHaveBeenCalledWith('Content created successfully');
    });
  });
}); 