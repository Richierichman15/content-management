import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import MainLayout from '../MainLayout';
import { AuthProvider } from '../../contexts/AuthContext';

const mockUser = {
  name: 'John Doe',
  email: 'john@example.com',
};

const mockLogout = vi.fn();

const renderWithProviders = (component) => {
  return render(
    <BrowserRouter>
      <AuthProvider value={{ user: mockUser, logout: mockLogout }}>
        {component}
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('MainLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders navigation links', () => {
    renderWithProviders(<MainLayout />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
    expect(screen.getByText('Media')).toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('displays user information', () => {
    renderWithProviders(<MainLayout />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('J')).toBeInTheDocument(); // User avatar initial
  });

  it('calls logout when logout button is clicked', () => {
    renderWithProviders(<MainLayout />);

    const logoutButton = screen.getByText('Logout');
    fireEvent.click(logoutButton);
    expect(mockLogout).toHaveBeenCalled();
  });

  it('renders the application title', () => {
    renderWithProviders(<MainLayout />);
    expect(screen.getByText('AI-Enhanced CMS')).toBeInTheDocument();
  });

  it('applies active styles to current route', () => {
    renderWithProviders(<MainLayout />);

    const dashboardLink = screen.getByText('Dashboard').closest('a');
    expect(dashboardLink).toHaveClass('bg-indigo-100', 'text-indigo-700');
  });

  it('renders the Outlet component', () => {
    renderWithProviders(<MainLayout />);
    expect(screen.getByRole('main')).toBeInTheDocument();
  });
}); 