const { WebSocketServer, WebSocket } = require('ws');

let wss = null;

/**
 * Initialize WebSocket Server attached to the HTTP server.
 */
function initWebSocketServer(server) {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    ws.isAlive = true;

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
        }
      } catch (err) {
        // ignore malformed ws messages
      }
    });

    // Send initial connection handshake
    ws.send(JSON.stringify({ event: 'connected', payload: { time: new Date() } }));
  });

  // Heartbeat interval to clean up stale connections
  const interval = setInterval(() => {
    if (!wss) return;
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(interval);
  });

  console.log('⚡ Real-time WebSocket Server initialized on /ws');
  return wss;
}

/**
 * Broadcast an event payload to all connected clients.
 */
function broadcastWebSocketEvent(event, data) {
  if (!wss) return;
  const payloadStr = JSON.stringify({ event, payload: data });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(payloadStr);
      } catch (err) {
        console.warn('[WebSocket Broadcast Error]:', err.message);
      }
    }
  });
}

module.exports = {
  initWebSocketServer,
  broadcastWebSocketEvent,
};
