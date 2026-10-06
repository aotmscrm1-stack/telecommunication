export const notificationService = {
  notify(message, type = 'info') {
    console.log(`[Notification - ${type.toUpperCase()}]: ${message}`);
  },

  success(message) {
    this.notify(message, 'success');
  },

  error(message) {
    this.notify(message, 'error');
  },

  warning(message) {
    this.notify(message, 'warning');
  }
};

export default notificationService;
