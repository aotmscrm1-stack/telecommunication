import { io } from 'socket.io-client';

export const ConnectionState = {
  DISCONNECTED: 'DISCONNECTED',
  CONNECTING: 'CONNECTING',
  CONNECTED: 'CONNECTED',
  RECONNECTING: 'RECONNECTING',
};

class TrackingSocketClient {
  constructor() {
    this.socket = null;
    this.connectionState = ConnectionState.DISCONNECTED;
    this.reconnectAttempts = 0;
    this.listeners = new Map();
    this.isAdminSubscribed = false;
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

  getConnectionState() {
    return this.connectionState;
  }

  isConnected() {
    return this.connectionState === ConnectionState.CONNECTED && this.socket?.connected === true;
  }

  setConnectionState(state, payload = {}) {
    if (this.connectionState !== state) {
      this.connectionState = state;
      this.emitInternal('connectionStateChange', { state, ...payload });
    }
  }

  connect() {
    const token = localStorage.getItem('aotms_token');
    if (!token) {
      this.setConnectionState(ConnectionState.DISCONNECTED, { reason: 'No auth token found' });
      return null;
    }

    if (this.socket && (this.socket.connected || this.connectionState === ConnectionState.CONNECTING)) {
      return this.socket;
    }

    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    const socketUrl = this.getSocketUrl();
    this.setConnectionState(ConnectionState.CONNECTING);

    this.socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 8000,
      randomizationFactor: 0.2,
      timeout: 20000,
    });

    // ── Connection lifecycle events ─────────────────────────────────────────
    this.socket.on('connect', () => {
      this.reconnectAttempts = 0;
      this.setConnectionState(ConnectionState.CONNECTED, { socketId: this.socket.id });
      this.emitInternal('connect', true);

      // Auto re-subscribe as admin if previously subscribed
      if (this.isAdminSubscribed) {
        this.subscribeAdmin().catch(() => {});
      }
    });

    this.socket.on('disconnect', (reason) => {
      if (reason === 'io server disconnect') {
        // Disconnected by server -> manual reconnect needed
        this.setConnectionState(ConnectionState.DISCONNECTED, { reason });
        this.socket.connect();
      } else {
        this.setConnectionState(ConnectionState.RECONNECTING, { reason });
      }
      this.emitInternal('disconnect', reason);
    });

    this.socket.on('connect_error', (err) => {
      this.reconnectAttempts += 1;
      this.setConnectionState(ConnectionState.RECONNECTING, {
        error: err.message,
        attempt: this.reconnectAttempts,
      });
      this.emitInternal('error', err);
    });

    this.socket.io.on('reconnect_attempt', (attempt) => {
      this.reconnectAttempts = attempt;
      this.setConnectionState(ConnectionState.RECONNECTING, { attempt });
    });

    this.socket.io.on('reconnect', (attempt) => {
      this.reconnectAttempts = 0;
      this.setConnectionState(ConnectionState.CONNECTED, { attempt });
    });

    // ── Telemetry events from server ─────────────────────────────────────────
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
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      this.isAdminSubscribed = false;
      this.setConnectionState(ConnectionState.DISCONNECTED);
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
    if (!this.socket || !this.isConnected()) {
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
    this.isAdminSubscribed = true;
    this.connect();
    return new Promise((resolve) => {
      if (!this.socket) return resolve([]);

      const timeout = setTimeout(() => {
        resolve([]);
      }, 3500);

      this.socket.emit('admin:subscribe', (response) => {
        clearTimeout(timeout);
        if (response?.success) resolve(response.employees || []);
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
