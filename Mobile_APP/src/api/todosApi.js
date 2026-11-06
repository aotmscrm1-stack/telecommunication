import client from './client';

export const todosApi = {
  /**
   * Fetch todos (scoped to Manager/Department or user)
   * @param {Object} params - { status, due, date, callerId, forMe }
   */
  getTodos: async (params = {}) => {
    const res = await client.get('/todos', { params });
    return res.data;
  },

  /**
   * Fetch single todo details by ID
   */
  getOne: async (id) => {
    const res = await client.get(`/todos/${id}`);
    return res.data;
  },

  /**
   * Create new todo task
   * @param {Object} data - { title, description, priority, dueDate, scheduledAt, assignedTo }
   */
  createTodo: async (data) => {
    const res = await client.post('/todos', data);
    return res.data;
  },

  /**
   * Update todo fields
   */
  updateTodo: async (id, data) => {
    const res = await client.put(`/todos/${id}`, data);
    return res.data;
  },

  /**
   * Update todo status (e.g. 'done' | 'pending' | 'in_progress')
   */
  updateStatus: async (id, status, reason = '') => {
    const res = await client.patch(`/todos/${id}/status`, { status, reason });
    return res.data;
  },

  /**
   * Delete todo task
   */
  deleteTodo: async (id) => {
    const res = await client.delete(`/todos/${id}`);
    return res.data;
  },

  /**
   * Toggle checklist item
   */
  toggleChecklist: async (id, itemId) => {
    const res = await client.patch(`/todos/${id}/checklist/${itemId}`);
    return res.data;
  },

  /**
   * Add new item to checklist
   */
  addChecklist: async (id, title) => {
    const res = await client.post(`/todos/${id}/checklist`, { title });
    return res.data;
  },
};

export default todosApi;

