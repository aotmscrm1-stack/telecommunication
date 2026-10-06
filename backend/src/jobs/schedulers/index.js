module.exports = {
  schedulePeriodicTask: (fn, intervalMs) => {
    return setInterval(fn, intervalMs);
  }
};
