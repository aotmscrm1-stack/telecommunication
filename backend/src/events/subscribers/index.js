const { eventBus } = require('../publishers');
const logger = require('../../core/logger/logger');

const initSubscribers = () => {
  eventBus.on('lead:created', (lead) => {
    logger.info(`[Event Subscriber] Lead created event received: ${lead.name || lead._id}`);
  });

  eventBus.on('task:created', (task) => {
    logger.info(`[Event Subscriber] Task created event received: ${task.title || task._id}`);
  });
};

module.exports = { initSubscribers };
