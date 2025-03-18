const Content = require('../models/content.model');
const cron = require('node-cron');
const mongoose = require('mongoose');

/**
 * Service to handle content publishing and unpublishing at scheduled times
 */
class SchedulerService {
  constructor() {
    // Schedule to run every minute
    this.job = cron.schedule('* * * * *', this.processScheduledContent.bind(this), {
      scheduled: false
    });
    
    // Store scheduled items in memory for quicker access
    this.scheduledItems = {
      publish: new Map(),
      unpublish: new Map()
    };
  }

  /**
   * Start the scheduler
   */
  start() {
    console.log('Starting content scheduler service');
    this.loadScheduledItems();
    this.job.start();
  }

  /**
   * Stop the scheduler
   */
  stop() {
    console.log('Stopping content scheduler service');
    this.job.stop();
  }
  
  /**
   * Load all scheduled items from the database
   */
  async loadScheduledItems() {
    try {
      const ScheduleModel = mongoose.model('ContentSchedule');
      const schedules = await ScheduleModel.find({}).lean();
      
      this.scheduledItems.publish.clear();
      this.scheduledItems.unpublish.clear();
      
      for (const schedule of schedules) {
        this.scheduledItems[schedule.action].set(
          schedule.contentId.toString(),
          {
            id: schedule._id,
            date: schedule.scheduledDate,
            contentId: schedule.contentId
          }
        );
      }
      
      console.log(`Loaded ${schedules.length} scheduled items`);
    } catch (error) {
      console.error('Error loading scheduled items:', error);
    }
  }

  /**
   * Process all content that is scheduled to be published or unpublished
   */
  async processScheduledContent() {
    try {
      const now = new Date();
      
      // Process publications
      await this.processAction(now, 'publish');
      
      // Process unpublications
      await this.processAction(now, 'unpublish');
    } catch (error) {
      console.error('Error processing scheduled content:', error);
    }
  }
  
  /**
   * Process a specific action (publish or unpublish)
   */
  async processAction(now, action) {
    try {
      // Get the schedule model
      const ScheduleModel = mongoose.model('ContentSchedule');
      
      // Find all scheduled content with the given action
      const schedules = await ScheduleModel.find({
        scheduledDate: { $lte: now },
        action
      }).populate('contentId');
      
      console.log(`Found ${schedules.length} items to ${action}`);
      
      for (const schedule of schedules) {
        try {
          const content = schedule.contentId;
          
          if (!content) {
            console.log(`Content not found for schedule ${schedule._id}, removing schedule`);
            await ScheduleModel.deleteOne({ _id: schedule._id });
            continue;
          }
          
          // Update content status based on action
          if (action === 'publish' && content.status !== 'published') {
            content.status = 'published';
            content.publishedAt = now;
            
            // Add to revision history
            content.revisionHistory.push({
              changes: 'Auto-published by scheduler',
              changedAt: now
            });
          } else if (action === 'unpublish' && content.status === 'published') {
            content.status = 'draft';
            
            // Add to revision history
            content.revisionHistory.push({
              changes: 'Auto-unpublished by scheduler',
              changedAt: now
            });
          }
          
          // Save the content
          await content.save();
          console.log(`${action === 'publish' ? 'Published' : 'Unpublished'} scheduled content: ${content.title} (${content._id})`);
          
          // Remove the schedule
          await ScheduleModel.deleteOne({ _id: schedule._id });
          
          // Remove from in-memory cache
          this.scheduledItems[action].delete(content._id.toString());
        } catch (err) {
          console.error(`Error ${action}ing content ${schedule.contentId}:`, err);
        }
      }
    } catch (error) {
      console.error(`Error processing ${action} schedules:`, error);
    }
  }
  
  /**
   * Schedule content for publication or unpublication
   * @param {string} contentId - The ID of the content to schedule
   * @param {Date} date - The date to perform the action
   * @param {string} action - Either 'publish' or 'unpublish'
   * @returns {Object} The scheduled item
   */
  async scheduleContent(contentId, date, action) {
    try {
      // Validate action
      if (!['publish', 'unpublish'].includes(action)) {
        throw new Error('Action must be either "publish" or "unpublish"');
      }
      
      // Validate date is in the future
      const now = new Date();
      if (date <= now) {
        throw new Error('Scheduled date must be in the future');
      }
      
      // Check if content exists
      const content = await Content.findById(contentId);
      if (!content) {
        throw new Error('Content not found');
      }
      
      // Remove any existing schedule for this content and action
      await this.removeSchedule(contentId, action);
      
      // Create the schedule
      const ScheduleModel = mongoose.model('ContentSchedule');
      const schedule = await ScheduleModel.create({
        contentId,
        scheduledDate: date,
        action,
        createdAt: now
      });
      
      // Add to in-memory cache
      this.scheduledItems[action].set(contentId.toString(), {
        id: schedule._id,
        date,
        contentId
      });
      
      return schedule;
    } catch (error) {
      console.error(`Error scheduling content ${contentId} for ${action}:`, error);
      throw error;
    }
  }
  
  /**
   * Update an existing schedule
   * @param {string} contentId - The ID of the content
   * @param {Date} date - The new date to perform the action
   * @param {string} action - Either 'publish' or 'unpublish'
   * @returns {Object} The updated schedule
   */
  async updateSchedule(contentId, date, action) {
    try {
      // Check if a schedule exists
      const ScheduleModel = mongoose.model('ContentSchedule');
      let schedule = await ScheduleModel.findOne({ contentId, action });
      
      if (schedule) {
        // Update existing schedule
        schedule.scheduledDate = date;
        await schedule.save();
        
        // Update in-memory cache
        this.scheduledItems[action].set(contentId.toString(), {
          id: schedule._id,
          date,
          contentId
        });
      } else {
        // Create new schedule
        schedule = await this.scheduleContent(contentId, date, action);
      }
      
      return schedule;
    } catch (error) {
      console.error(`Error updating schedule for content ${contentId}:`, error);
      throw error;
    }
  }
  
  /**
   * Remove a schedule for a specific action
   * @param {string} contentId - The ID of the content
   * @param {string} action - Either 'publish' or 'unpublish'
   */
  async removeSchedule(contentId, action) {
    try {
      const ScheduleModel = mongoose.model('ContentSchedule');
      await ScheduleModel.deleteOne({ contentId, action });
      
      // Remove from in-memory cache
      this.scheduledItems[action].delete(contentId.toString());
      
      return true;
    } catch (error) {
      console.error(`Error removing ${action} schedule for content ${contentId}:`, error);
      throw error;
    }
  }
  
  /**
   * Remove all schedules for a content
   * @param {string} contentId - The ID of the content
   */
  async removeAllSchedules(contentId) {
    try {
      const ScheduleModel = mongoose.model('ContentSchedule');
      await ScheduleModel.deleteMany({ contentId });
      
      // Remove from in-memory cache
      this.scheduledItems.publish.delete(contentId.toString());
      this.scheduledItems.unpublish.delete(contentId.toString());
      
      return true;
    } catch (error) {
      console.error(`Error removing all schedules for content ${contentId}:`, error);
      throw error;
    }
  }
  
  /**
   * Get all schedules for a content
   * @param {string} contentId - The ID of the content
   * @returns {Object} The schedules
   */
  async getContentSchedule(contentId) {
    try {
      const ScheduleModel = mongoose.model('ContentSchedule');
      const schedules = await ScheduleModel.find({ contentId });
      
      const result = {
        contentId,
        publish: null,
        unpublish: null
      };
      
      for (const schedule of schedules) {
        result[schedule.action] = {
          scheduledDate: schedule.scheduledDate,
          createdAt: schedule.createdAt
        };
      }
      
      return result;
    } catch (error) {
      console.error(`Error getting schedules for content ${contentId}:`, error);
      throw error;
    }
  }
}

// Create singleton instance
const schedulerService = new SchedulerService();

module.exports = schedulerService; 