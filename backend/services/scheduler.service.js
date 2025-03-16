const Content = require('../models/content.model');
const cron = require('node-cron');

/**
 * Service to handle content publishing at scheduled times
 */
class SchedulerService {
  constructor() {
    // Schedule to run every minute
    this.job = cron.schedule('* * * * *', this.processScheduledContent.bind(this), {
      scheduled: false
    });
  }

  /**
   * Start the scheduler
   */
  start() {
    console.log('Starting content scheduler service');
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
   * Process all content that is scheduled to be published
   */
  async processScheduledContent() {
    try {
      // Find all scheduled content that should be published now
      const now = new Date();
      const scheduledContent = await Content.find({
        scheduledPublish: { $lte: now },
        status: 'draft'
      });

      console.log(`Found ${scheduledContent.length} items to publish`);

      // Publish each item
      for (const content of scheduledContent) {
        try {
          // Update status to published
          content.status = 'published';
          content.publishedAt = now;
          
          // Clear the scheduled time since it's been processed
          content.scheduledPublish = null;
          
          // Add to revision history
          content.revisionHistory.push({
            changes: 'Auto-published by scheduler',
            changedAt: now
          });
          
          await content.save();
          console.log(`Published scheduled content: ${content.title} (${content._id})`);
        } catch (err) {
          console.error(`Error publishing content ${content._id}:`, err);
        }
      }
    } catch (error) {
      console.error('Error processing scheduled content:', error);
    }
  }
}

// Create singleton instance
const schedulerService = new SchedulerService();

module.exports = schedulerService; 