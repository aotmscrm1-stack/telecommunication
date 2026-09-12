import trackingSocket from './trackingSocketClient';
import { trackingAPI } from './api';

function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  if (lat1 === lat2 && lon1 === lon2) return 0;
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

class GeoTrackerService {
  constructor() {
    this.watchId = null;
    this.isTracking = false;
    this.lastPosition = null;
    this.lastSentTime = 0;
    this.error = null;
    this.listeners = new Set();
    this.minUpdateIntervalMs = 3000; // Throttle to maximum 1 update every 3 seconds
    this.minDistanceMeters = 3; // Or when position shifted by at least 3 meters
  }

  isSupported() {
    return typeof window !== 'undefined' && 'geolocation' in navigator;
  }

  async getBatteryLevel() {
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.getBattery === 'function') {
        const battery = await navigator.getBattery();
        return Math.round(battery.level * 100);
      }
    } catch {
      // ignore
    }
    return null;
  }

  async startTracking() {
    if (!this.isSupported()) {
      throw new Error('Geolocation is not supported by your browser.');
    }

    if (this.isTracking) {
      return this.lastPosition;
    }

    this.error = null;

    // Helper to extract clean payload from GeolocationPosition
    const formatPos = async (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const accuracy = pos.coords.accuracy || 10;
      const rawSpeed = pos.coords.speed;
      const speed = rawSpeed != null && rawSpeed > 0 ? Math.round(rawSpeed * 3.6 * 10) / 10 : 0;
      const heading = pos.coords.heading || 0;
      const battery = await this.getBatteryLevel();

      return {
        latitude: lat,
        longitude: lng,
        accuracy,
        speed,
        heading,
        battery,
      };
    };

    // Stage 1: Try getting high-accuracy GPS fix with a sensible timeout
    const getFix = () =>
      new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          (errHigh) => {
            // Stage 2 fallback: If high accuracy times out or is unavailable, try standard accuracy
            if (errHigh.code === 1) {
              // Permission denied -> don't retry, immediately reject
              return reject(errHigh);
            }
            navigator.geolocation.getCurrentPosition(
              resolve,
              (errLow) => reject(errLow || errHigh),
              { enableHighAccuracy: false, timeout: 6000, maximumAge: 60000 }
            );
          },
          { enableHighAccuracy: true, timeout: 6000, maximumAge: 10000 }
        );
      });

    try {
      const rawPos = await getFix();
      const initialPayload = await formatPos(rawPos);

      this.lastPosition = initialPayload;
      this.lastSentTime = Date.now();
      this.isTracking = true;

      // Notify backend via Socket.IO and REST concurrently
      try {
        await trackingSocket.startTracking(initialPayload);
      } catch (sErr) {
        console.warn('[GeoTracker] Socket start notice:', sErr.message);
      }
      await trackingAPI.startTracking(initialPayload).catch(() => {});

      this.notifyListeners({
        isTracking: true,
        position: this.lastPosition,
        error: null,
      });

      // Start continuous real-time watchPosition
      this.watchId = navigator.geolocation.watchPosition(
        (pos) => this.handlePositionUpdate(pos),
        (err) => this.handlePositionError(err),
        {
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 2000,
        }
      );

      return this.lastPosition;
    } catch (err) {
      // If permission denied or position failed, format clear message
      const errorMsg = this.formatErrorMessage(err);
      this.error = errorMsg;
      this.isTracking = false;
      this.notifyListeners({
        isTracking: false,
        position: this.lastPosition,
        error: errorMsg,
      });
      throw new Error(errorMsg);
    }
  }

  async handlePositionUpdate(position) {
    if (!this.isTracking) return;

    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    const accuracy = position.coords.accuracy;
    const rawSpeed = position.coords.speed;
    let speed = rawSpeed != null && rawSpeed > 0 ? Math.round(rawSpeed * 3.6 * 10) / 10 : 0;
    const heading = position.coords.heading || 0;
    const battery = await this.getBatteryLevel();
    const now = Date.now();

    let distanceMoved = 0;
    if (this.lastPosition) {
      distanceMoved = calculateDistanceMeters(
        this.lastPosition.latitude,
        this.lastPosition.longitude,
        lat,
        lng
      );
      const deltaSec = (now - this.lastSentTime) / 1000;
      if (speed === 0 && distanceMoved > 2 && deltaSec > 0) {
        speed = Math.round((distanceMoved / deltaSec) * 3.6 * 10) / 10;
      }
    }

    const payload = {
      latitude: lat,
      longitude: lng,
      accuracy,
      speed,
      heading,
      battery,
      distanceMoved,
    };

    this.lastPosition = payload;

    // Throttle checks
    const timeSinceLast = now - this.lastSentTime;
    const shouldSend =
      timeSinceLast >= this.minUpdateIntervalMs ||
      distanceMoved >= this.minDistanceMeters ||
      this.lastSentTime === 0;

    if (shouldSend) {
      this.lastSentTime = now;
      try {
        await trackingSocket.sendLocationUpdate(payload);
      } catch (err) {
        // Fallback to REST ping if socket temporarily disconnected
        trackingAPI.pingLocation(payload).catch(() => {});
      }
    }

    this.notifyListeners({
      isTracking: true,
      position: this.lastPosition,
      error: null,
    });
  }

  handlePositionError(err) {
    const errorMsg = this.formatErrorMessage(err);
    this.error = errorMsg;
    console.warn('[GeoTracker Error]:', errorMsg);
    this.notifyListeners({
      isTracking: this.isTracking,
      position: this.lastPosition,
      error: errorMsg,
    });
  }

  formatErrorMessage(err) {
    if (!err) return 'Unknown location error';
    switch (err.code) {
      case 1:
        return 'Location permission denied. Please allow location access in your browser.';
      case 2:
        return 'GPS position unavailable. Please ensure GPS/location services are enabled.';
      case 3:
        return 'Location request timed out. Retrying GPS fix...';
      default:
        return err.message || 'Failed to retrieve location.';
    }
  }

  async stopTracking() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.isTracking = false;

    try {
      await trackingSocket.stopTracking();
    } catch {
      await trackingAPI.stopTracking().catch(() => {});
    }

    this.notifyListeners({
      isTracking: false,
      position: this.lastPosition,
      error: null,
    });

    return true;
  }

  subscribe(callback) {
    this.listeners.add(callback);
    callback({
      isTracking: this.isTracking,
      position: this.lastPosition,
      error: this.error,
    });
    return () => this.listeners.delete(callback);
  }

  notifyListeners(state) {
    this.listeners.forEach((cb) => {
      try {
        cb(state);
      } catch (err) {
        console.error('[GeoTracker listener error]:', err);
      }
    });
  }
}

export const geoTracker = new GeoTrackerService();
export default geoTracker;
