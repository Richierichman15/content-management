import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DarkModeToggle from '../DarkModeToggle';

describe('DarkModeToggle', () => {
  const mockMatchMedia = vi.fn();
  const mockLocalStorage = {
    getItem: vi.fn(),
    setItem: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: mockMatchMedia,
    });
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
    });
  });

  it('renders light mode icon by default', () => {
    mockLocalStorage.getItem.mockReturnValue('light');
    render(<DarkModeToggle />);
    expect(screen.getByLabelText('Switch to dark mode')).toBeInTheDocument();
  });

  it('renders dark mode icon when in dark mode', () => {
    mockLocalStorage.getItem.mockReturnValue('dark');
    render(<DarkModeToggle />);
    expect(screen.getByLabelText('Switch to light mode')).toBeInTheDocument();
  });

  it('toggles between light and dark mode', () => {
    mockLocalStorage.getItem.mockReturnValue('light');
    render(<DarkModeToggle />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('theme', 'dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    
    fireEvent.click(button);
    
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('theme', 'light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('respects system preference when no theme is set', () => {
    mockLocalStorage.getItem.mockReturnValue(null);
    mockMatchMedia.mockReturnValue({ matches: true });
    
    render(<DarkModeToggle />);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('applies custom className', () => {
    render(<DarkModeToggle className="custom-class" />);
    expect(screen.getByRole('button')).toHaveClass('custom-class');
  });
}); 