import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ContentSchedule from '../ContentSchedule';
import { toast } from 'react-toastify';
import { addDays, format } from 'date-fns';

// Mock toast
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

describe('ContentSchedule', () => {
  const onScheduleUpdateMock = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  it('renders loading state initially', () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    });

    render(
      <ContentSchedule 
        contentId="123" 
        currentStatus="draft" 
        onScheduleUpdate={onScheduleUpdateMock}
      />
    );
    
    expect(screen.getByText('Publishing Schedule')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders schedule form with default values', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    });

    render(
      <ContentSchedule 
        contentId="123" 
        currentStatus="draft" 
        onScheduleUpdate={onScheduleUpdateMock}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText('Publishing Schedule')).toBeInTheDocument();
      expect(screen.getByText('Schedule Publication')).toBeInTheDocument();
      expect(screen.getByLabelText('Publish Date')).toBeInTheDocument();
      expect(screen.getByLabelText('Publish Time')).toBeInTheDocument();
    });
  });

  it('shows scheduled info when content is scheduled', async () => {
    const tomorrow = addDays(new Date(), 1);
    const scheduledDate = format(tomorrow, 'yyyy-MM-dd');
    const scheduledTime = '15:00';
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        scheduledPublish: `${scheduledDate}T${scheduledTime}:00`,
      }),
    });

    render(
      <ContentSchedule 
        contentId="123" 
        currentStatus="draft" 
        onScheduleUpdate={onScheduleUpdateMock}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText('Scheduled to publish on:')).toBeInTheDocument();
      expect(screen.getByText('Cancel Schedule')).toBeInTheDocument();
    });
  });

  it('schedules publication successfully', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ message: 'Content scheduled' }),
      });

    render(
      <ContentSchedule 
        contentId="123" 
        currentStatus="draft" 
        onScheduleUpdate={onScheduleUpdateMock}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText('Schedule Publication')).toBeInTheDocument();
    });
    
    // Select a future date (tomorrow)
    const tomorrow = addDays(new Date(), 1);
    const tomorrowFormatted = format(tomorrow, 'yyyy-MM-dd');
    
    fireEvent.change(screen.getByLabelText('Publish Date'), {
      target: { value: tomorrowFormatted },
    });
    
    fireEvent.change(screen.getByLabelText('Publish Time'), {
      target: { value: '15:00' },
    });
    
    fireEvent.click(screen.getByText('Schedule Publication'));
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/content/123/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.stringContaining(tomorrowFormatted),
      });
      expect(toast.success).toHaveBeenCalledWith('Content scheduled successfully');
      expect(onScheduleUpdateMock).toHaveBeenCalled();
    });
  });

  it('cancels schedule successfully', async () => {
    const tomorrow = addDays(new Date(), 1);
    const scheduledDate = format(tomorrow, 'yyyy-MM-dd');
    const scheduledTime = '15:00';
    
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          scheduledPublish: `${scheduledDate}T${scheduledTime}:00`,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ message: 'Schedule cancelled' }),
      });

    render(
      <ContentSchedule 
        contentId="123" 
        currentStatus="draft" 
        onScheduleUpdate={onScheduleUpdateMock}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText('Cancel Schedule')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('Cancel Schedule'));
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/content/123/schedule', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      expect(toast.success).toHaveBeenCalledWith('Publishing schedule cancelled');
      expect(onScheduleUpdateMock).toHaveBeenCalledWith(null);
    });
  });

  it('shows warning when content is already published', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    });

    render(
      <ContentSchedule 
        contentId="123" 
        currentStatus="published" 
        onScheduleUpdate={onScheduleUpdateMock}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText('This content is already published.')).toBeInTheDocument();
      const scheduleButton = screen.getByText('Schedule Publication');
      expect(scheduleButton).toBeDisabled();
    });
  });

  it('shows error when future date is not selected', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    });

    render(
      <ContentSchedule 
        contentId="123" 
        currentStatus="draft" 
        onScheduleUpdate={onScheduleUpdateMock}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText('Schedule Publication')).toBeInTheDocument();
    });
    
    // Set a past date (yesterday)
    const yesterday = addDays(new Date(), -1);
    const yesterdayFormatted = format(yesterday, 'yyyy-MM-dd');
    
    fireEvent.change(screen.getByLabelText('Publish Date'), {
      target: { value: yesterdayFormatted },
    });
    
    fireEvent.click(screen.getByText('Schedule Publication'));
    
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Please select a future date and time');
    });
  });

  it('handles error when scheduling fails', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      })
      .mockResolvedValueOnce({
        ok: false,
        statusText: 'Server Error',
      });

    render(
      <ContentSchedule 
        contentId="123" 
        currentStatus="draft" 
        onScheduleUpdate={onScheduleUpdateMock}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText('Schedule Publication')).toBeInTheDocument();
    });
    
    // Select a future date
    const tomorrow = addDays(new Date(), 1);
    const tomorrowFormatted = format(tomorrow, 'yyyy-MM-dd');
    
    fireEvent.change(screen.getByLabelText('Publish Date'), {
      target: { value: tomorrowFormatted },
    });
    
    fireEvent.click(screen.getByText('Schedule Publication'));
    
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Failed to schedule content'));
    });
  });
}); 