const eventBus = require('./eventBus');

module.exports = {
  eventBus,
  publishLeadCreated: (lead) => eventBus.emit('lead:created', lead),
  publishLeadUpdated: (lead) => eventBus.emit('lead:updated', lead),
  publishTaskCreated: (task) => eventBus.emit('task:created', task),
};
