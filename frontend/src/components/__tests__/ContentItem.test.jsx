import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ContentItem from '../ContentItem';

const mockContent = {
  id: '1',
  title: 'Test Content',
  description: 'This is a test description',
  type: 'article',
  status: 'published',
  tags: ['test', 'example'],
  createdAt: '2024-03-20T12:00:00Z',
};

const renderWithRouter = (component) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('ContentItem', () => {
  it('renders content item with all information', () => {
    renderWithRouter(<ContentItem content={mockContent} />);

    expect(screen.getByText('Test Content')).toBeInTheDocument();
    expect(screen.getByText('This is a test description')).toBeInTheDocument();
    expect(screen.getByText(/article/)).toBeInTheDocument();
    expect(screen.getByText('Published')).toBeInTheDocument();
    expect(screen.getByText('test')).toBeInTheDocument();
    expect(screen.getByText('example')).toBeInTheDocument();
  });

  it('renders without actions when showActions is false', () => {
    renderWithRouter(<ContentItem content={mockContent} showActions={false} />);

    expect(screen.queryByTitle('Edit')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Delete')).not.toBeInTheDocument();
  });

  it('calls onDelete when delete button is clicked and confirmed', () => {
    const onDelete = vi.fn();
    const confirmSpy = vi.spyOn(window, 'confirm');
    confirmSpy.mockImplementation(() => true);

    renderWithRouter(
      <ContentItem content={mockContent} onDelete={onDelete} showActions={true} />
    );

    fireEvent.click(screen.getByTitle('Delete'));
    expect(confirmSpy).toHaveBeenCalled();
    expect(onDelete).toHaveBeenCalledWith('1');

    confirmSpy.mockRestore();
  });

  it('does not call onDelete when delete is canceled', () => {
    const onDelete = vi.fn();
    const confirmSpy = vi.spyOn(window, 'confirm');
    confirmSpy.mockImplementation(() => false);

    renderWithRouter(
      <ContentItem content={mockContent} onDelete={onDelete} showActions={true} />
    );

    fireEvent.click(screen.getByTitle('Delete'));
    expect(confirmSpy).toHaveBeenCalled();
    expect(onDelete).not.toHaveBeenCalled();

    confirmSpy.mockRestore();
  });

  it('renders different status colors', () => {
    const draftContent = { ...mockContent, status: 'draft' };
    const { rerender } = renderWithRouter(<ContentItem content={draftContent} />);

    expect(screen.getByText('Draft')).toHaveClass('text-yellow-600');

    const publishedContent = { ...mockContent, status: 'published' };
    rerender(<ContentItem content={publishedContent} />);

    expect(screen.getByText('Published')).toHaveClass('text-green-600');
  });
}); 