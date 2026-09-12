import { io } from 'socket.io-client';

class TrackingSocketClient {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.listeners = new Map();
  }

  getSocketUrl() {
    if (import.meta.env.VITE_SOCKET_URL) {
      return import.meta.env.VITE_SOCKET_URL;
    }
    if (import.meta.env.DEV) {
      return 'http://localhost:5000';
    }
    return window.location.origin;
  }

  connect() {
    const token = localStorage.getItem('aotms_token');
    if (!token) return null;

    if (this.socket && this.socket.connected) {
      return this.socket;
    }

    const socketUrl = this.getSocketUrl();

    this.socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    this.socket.on('connect', () => {
      this.connected = true;
      console.log('[TrackingSocket] Connected as', this.socket.id);
      this.emitInternal('connect', true);
    });

    this.socket.on('disconnect', (reason) => {
      this.connected = false;
      console.warn('[TrackingSocket] Disconnected:', reason);
      this.emitInternal('disconnect', reason);
    });

    this.socket.on('connect_error', (err) => {
      console.warn('[TrackingSocket Auth/Conn Error]:', err.message);
      this.emitInternal('error', err);
    });

    // Handle incoming telemetry events from server
    this.socket.on('admin:employee:location', (data) => {
      this.emitInternal('admin:employee:location', data);
    });

    this.socket.on('admin:employee:status', (data) => {
      this.emitInternal('admin:employee:status', data);
    });

    this.socket.on('employee:tracking:status', (data) => {
      this.emitInternal('employee:tracking:status', data);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }

  startTracking(data = {}) {
    this.connect();
    return new Promise((resolve) => {
      if (!this.socket) {
        return resolve({ ok: false, message: 'Socket not initialized' });
      }

      const timeout = setTimeout(() => {
        resolve({ ok: true, fallback: true });
      }, 3000);

      this.socket.emit('employee:tracking:start', data, (response) => {
        clearTimeout(timeout);
        if (response?.success) resolve(response.location);
        else resolve({ ok: true, location: response?.location });
      });
    });
  }

  sendLocationUpdate(data = {}) {
    if (!this.socket || !this.connected) {
      this.connect();
    }
    return new Promise((resolve) => {
      if (!this.socket) {
        return resolve({ ok: false });
      }

      const timeout = setTimeout(() => {
        resolve({ ok: true, timeout: true });
      }, 3000);

      this.socket.emit('employee:location:update', data, (response) => {
        clearTimeout(timeout);
        if (response?.success) resolve(response.location);
        else resolve({ ok: false, error: response?.error });
      });
    });
  }

  stopTracking() {
    return new Promise((resolve) => {
      if (!this.socket) return resolve({ trackingStatus: 'OFFLINE' });

      const timeout = setTimeout(() => {
        resolve({ trackingStatus: 'OFFLINE' });
      }, 2500);

      this.socket.emit('employee:tracking:stop', {}, (response) => {
        clearTimeout(timeout);
        if (response?.success) resolve(response.location);
        else resolve({ trackingStatus: 'OFFLINE' });
      });
    });
  }

  subscribeAdmin() {
    this.connect();
    return new Promise((resolve) => {
      if (!this.socket) return resolve([]);

      const timeout = setTimeout(() => {
        resolve([]);
      }, 3500);

      this.socket.emit('admin:subscribe', (response) => {
        clearTimeout(timeout);
        if (response?.success) resolve(response.employees);
        else resolve([]);
      });
    });
  }

  // ── Listener registry ───────────────────────────────────────────────────────
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  emitInternal(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach((cb) => {
        try {
          cb(data);
        } catch (err) {
          console.error('[TrackingSocket listener error]:', err);
        }
      });
    }
  }
}

export const trackingSocket = new TrackingSocketClient();
export default trackingSocket;
