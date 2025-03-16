import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import ContentTemplates from '../ContentTemplates';
import { toast } from 'react-toastify';

// Mock react-toastify
jest.mock('react-toastify', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

// Mock fetch API
global.fetch = jest.fn();

describe('ContentTemplates', () => {
  const mockOnSelectTemplate = jest.fn();
  const mockOnClose = jest.fn();
  const mockTemplates = [
    {
      _id: '1',
      title: 'Blog Post Template',
      excerpt: 'A standard blog post template',
      templateCategory: 'blog',
      tags: ['blog', 'article'],
      readingTime: 5,
      updatedAt: new Date().toISOString(),
    },
    {
      _id: '2',
      title: 'Newsletter Template',
      excerpt: 'Weekly newsletter template',
      templateCategory: 'newsletter',
      tags: ['email', 'newsletter'],
      readingTime: 3,
      updatedAt: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders loading state', () => {
    fetch.mockImplementationOnce(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: () => Promise.resolve({ templates: mockTemplates })
      }), 100))
    );

    render(
      <ContentTemplates 
        onSelectTemplate={mockOnSelectTemplate} 
        onClose={mockOnClose} 
      />
    );

    expect(screen.getByText('Loading templates...')).toBeInTheDocument();
  });

  test('renders templates after loading', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ templates: mockTemplates })
    });

    render(
      <ContentTemplates 
        onSelectTemplate={mockOnSelectTemplate} 
        onClose={mockOnClose} 
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Blog Post Template')).toBeInTheDocument();
      expect(screen.getByText('Newsletter Template')).toBeInTheDocument();
    });
  });

  test('calls onSelectTemplate when a template is selected', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ templates: mockTemplates })
    });

    render(
      <ContentTemplates 
        onSelectTemplate={mockOnSelectTemplate} 
        onClose={mockOnClose} 
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Blog Post Template')).toBeInTheDocument();
    });

    const useButtons = screen.getAllByText('Use This Template');
    fireEvent.click(useButtons[0]);

    expect(mockOnSelectTemplate).toHaveBeenCalledWith(mockTemplates[0]);
  });

  test('calls onClose when Close button is clicked', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ templates: mockTemplates })
    });

    render(
      <ContentTemplates 
        onSelectTemplate={mockOnSelectTemplate} 
        onClose={mockOnClose} 
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Content Templates')).toBeInTheDocument();
    });

    const closeButton = screen.getByText('Close');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  test('shows error message when API call fails', async () => {
    fetch.mockRejectedValueOnce(new Error('Failed to load'));

    render(
      <ContentTemplates 
        onSelectTemplate={mockOnSelectTemplate} 
        onClose={mockOnClose} 
      />
    );

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Error loading templates: Failed to load');
    });
  });

  test('filters templates by category', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ templates: mockTemplates })
    });

    render(
      <ContentTemplates 
        onSelectTemplate={mockOnSelectTemplate} 
        onClose={mockOnClose} 
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Blog Post Template')).toBeInTheDocument();
      expect(screen.getByText('Newsletter Template')).toBeInTheDocument();
    });

    // Click on Newsletter category
    const newsletterCategoryButton = screen.getByText('Newsletters');
    fireEvent.click(newsletterCategoryButton);

    // Blog post template should not be visible, but newsletter should
    expect(screen.queryByText('Blog Post Template')).not.toBeInTheDocument();
    expect(screen.getByText('Newsletter Template')).toBeInTheDocument();
  });

  test('filters templates by search term', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ templates: mockTemplates })
    });

    render(
      <ContentTemplates 
        onSelectTemplate={mockOnSelectTemplate} 
        onClose={mockOnClose} 
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Blog Post Template')).toBeInTheDocument();
    });

    // Search for "newsletter"
    const searchInput = screen.getByPlaceholderText('Search templates...');
    fireEvent.change(searchInput, { target: { value: 'newsletter' } });

    // Blog post template should not be visible, but newsletter should
    expect(screen.queryByText('Blog Post Template')).not.toBeInTheDocument();
    expect(screen.getByText('Newsletter Template')).toBeInTheDocument();
  });
}); 