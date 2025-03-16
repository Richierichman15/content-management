import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { toast } from 'react-toastify';
import Settings from '../Settings';
import { AuthProvider } from '../../../contexts/AuthContext';

// Mock react-toastify
vi.mock('react-toastify', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Settings', () => {
  const mockSettings = {
    emailNotifications: true,
    contentNotifications: true,
    mediaNotifications: true,
    language: 'en',
    timezone: 'UTC',
    dateFormat: 'MM/DD/YYYY',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  it('renders settings form with initial values', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockSettings),
    });

    render(
      <AuthProvider>
        <Settings />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Email Notifications')).toBeChecked();
      expect(screen.getByLabelText('Content Update Notifications')).toBeChecked();
      expect(screen.getByLabelText('Media Upload Notifications')).toBeChecked();
      expect(screen.getByDisplayValue('en')).toBeInTheDocument();
      expect(screen.getByDisplayValue('UTC')).toBeInTheDocument();
      expect(screen.getByDisplayValue('MM/DD/YYYY')).toBeInTheDocument();
    });
  });

  it('handles form submission successfully', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSettings),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

    render(
      <AuthProvider>
        <Settings />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Email Notifications')).toBeChecked();
    });

    const submitButton = screen.getByText('Save Changes');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/users/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mockSettings),
      });
      expect(toast.success).toHaveBeenCalledWith('Settings updated successfully');
    });
  });

  it('handles form submission error', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSettings),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

    render(
      <AuthProvider>
        <Settings />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Email Notifications')).toBeChecked();
    });

    const submitButton = screen.getByText('Save Changes');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to update settings');
    });
  });

  it('handles initial fetch error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    render(
      <AuthProvider>
        <Settings />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to load settings');
    });
  });

  it('updates form values when changed', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockSettings),
    });

    render(
      <AuthProvider>
        <Settings />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Email Notifications')).toBeChecked();
    });

    // Toggle email notifications
    fireEvent.click(screen.getByLabelText('Email Notifications'));
    expect(screen.getByLabelText('Email Notifications')).not.toBeChecked();

    // Change language
    const languageSelect = screen.getByDisplayValue('en');
    fireEvent.change(languageSelect, { target: { value: 'es' } });
    expect(languageSelect).toHaveValue('es');

    // Change timezone
    const timezoneSelect = screen.getByDisplayValue('UTC');
    fireEvent.change(timezoneSelect, { target: { value: 'EST' } });
    expect(timezoneSelect).toHaveValue('EST');

    // Change date format
    const dateFormatSelect = screen.getByDisplayValue('MM/DD/YYYY');
    fireEvent.change(dateFormatSelect, { target: { value: 'DD/MM/YYYY' } });
    expect(dateFormatSelect).toHaveValue('DD/MM/YYYY');
  });
}); 