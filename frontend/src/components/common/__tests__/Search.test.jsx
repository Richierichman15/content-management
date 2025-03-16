import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import Search from '../Search';
import debounce from 'lodash/debounce';

// Mock lodash debounce
vi.mock('lodash/debounce', () => ({
  default: vi.fn((fn) => {
    fn.cancel = vi.fn();
    return fn;
  }),
}));

describe('Search', () => {
  const mockOnSearch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with default props', () => {
    render(<Search onSearch={mockOnSearch} />);
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
  });

  it('renders with custom placeholder', () => {
    render(<Search onSearch={mockOnSearch} placeholder="Custom placeholder" />);
    expect(screen.getByPlaceholderText('Custom placeholder')).toBeInTheDocument();
  });

  it('calls onSearch when input value changes', () => {
    render(<Search onSearch={mockOnSearch} />);
    const input = screen.getByPlaceholderText('Search...');
    fireEvent.change(input, { target: { value: 'test' } });
    expect(mockOnSearch).toHaveBeenCalledWith('test');
  });

  it('clears input when clear button is clicked', () => {
    render(<Search onSearch={mockOnSearch} />);
    const input = screen.getByPlaceholderText('Search...');
    fireEvent.change(input, { target: { value: 'test' } });
    const clearButton = screen.getByRole('button');
    fireEvent.click(clearButton);
    expect(input.value).toBe('');
  });

  it('applies custom className', () => {
    render(<Search onSearch={mockOnSearch} className="custom-class" />);
    expect(screen.getByRole('searchbox').parentElement.parentElement).toHaveClass('custom-class');
  });

  it('cancels debounced search on unmount', () => {
    const { unmount } = render(<Search onSearch={mockOnSearch} />);
    unmount();
    expect(debounce.mock.results[0].value.cancel).toHaveBeenCalled();
  });
}); 