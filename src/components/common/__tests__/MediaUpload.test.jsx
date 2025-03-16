import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MediaUpload from '../MediaUpload';

describe('MediaUpload', () => {
  const mockOnUpload = vi.fn();
  const mockOnRemove = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the upload area with default props', () => {
    render(
      <MediaUpload
        onUpload={mockOnUpload}
        onRemove={mockOnRemove}
      />
    );

    expect(screen.getByText(/drag and drop files here/i)).toBeInTheDocument();
    expect(screen.getByText(/supported formats/i)).toBeInTheDocument();
  });

  it('shows error message when error prop is provided', () => {
    const errorMessage = 'File size too large';
    render(
      <MediaUpload
        onUpload={mockOnUpload}
        onRemove={mockOnRemove}
        error={errorMessage}
      />
    );

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('displays preview when value prop is provided', () => {
    const mockValue = {
      file: new File([''], 'test.jpg', { type: 'image/jpeg' }),
      preview: 'test-preview-url',
    };

    render(
      <MediaUpload
        onUpload={mockOnUpload}
        onRemove={mockOnRemove}
        value={mockValue}
      />
    );

    const preview = screen.getByAltText('test.jpg');
    expect(preview).toBeInTheDocument();
    expect(preview).toHaveAttribute('src', 'test-preview-url');
  });

  it('displays multiple previews when multiple prop is true', () => {
    const mockValues = [
      {
        file: new File([''], 'test1.jpg', { type: 'image/jpeg' }),
        preview: 'test-preview-url-1',
      },
      {
        file: new File([''], 'test2.jpg', { type: 'image/jpeg' }),
        preview: 'test-preview-url-2',
      },
    ];

    render(
      <MediaUpload
        onUpload={mockOnUpload}
        onRemove={mockOnRemove}
        value={mockValues}
        multiple
      />
    );

    expect(screen.getByAltText('test1.jpg')).toBeInTheDocument();
    expect(screen.getByAltText('test2.jpg')).toBeInTheDocument();
  });

  it('calls onRemove when remove button is clicked', () => {
    const mockValue = {
      file: new File([''], 'test.jpg', { type: 'image/jpeg' }),
      preview: 'test-preview-url',
    };

    render(
      <MediaUpload
        onUpload={mockOnUpload}
        onRemove={mockOnRemove}
        value={mockValue}
      />
    );

    const removeButton = screen.getByRole('button');
    fireEvent.click(removeButton);
    expect(mockOnRemove).toHaveBeenCalled();
  });

  it('calls onRemove with specific file when remove button is clicked in multiple mode', () => {
    const mockFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
    const mockValues = [
      {
        file: mockFile,
        preview: 'test-preview-url',
      },
    ];

    render(
      <MediaUpload
        onUpload={mockOnUpload}
        onRemove={mockOnRemove}
        value={mockValues}
        multiple
      />
    );

    const removeButton = screen.getByRole('button');
    fireEvent.click(removeButton);
    expect(mockOnRemove).toHaveBeenCalledWith(mockFile);
  });
}); 