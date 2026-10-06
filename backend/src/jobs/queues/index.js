// Queue system wrapper (BullMQ / InMemory queue interface)
class JobQueue {
  constructor(name) {
    this.name = name;
    this.jobs = [];
  }

  async add(data) {
    this.jobs.push(data);
    return { id: Date.now(), data };
  }
}

module.exports = {
  createQueue: (name) => new JobQueue(name)
};
