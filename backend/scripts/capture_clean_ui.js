const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
  '--headless=new',
  '--remote-debugging-port=9222',
  '--user-data-dir=C:\\Users\\raman\\AppData\\Local\\Temp\\chrome_crm_cdp3',
  '--disable-gpu',
  '--window-size=1440,900',
  '--no-sandbox',
  'about:blank'
]);

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhYjI1YjVkYzZkMjA2MmM3Y2QxMmVlYSIsImVtYWlsIjoiamF5YXZlZXJAYW90bXMuaW4iLCJyb2xlIjoiZW1wbG95ZWUiLCJpYXQiOjE3OTIxNjYxODYsImV4cCI6MTc5MjI1MjU4Nn0.VlMLKhmvSQzjihyjtZGH3o6JvsnKEyZx1YInmCc2uq4';
const userStr = JSON.stringify({ _id: '6ab25b5dc6d2062c7cd12eea', name: 'Ramanadham Jayaveer', email: 'jayaveer@aotms.in', role: 'employee', department: 'Development' });

setTimeout(() => {
  http.get('http://127.0.0.1:9222/json', (res) => {
    let d = '';
    res.on('data', chunk => d += chunk);
    res.on('end', () => {
      const targets = JSON.parse(d);
      const page = targets.find(t => t.type === 'page');
      const ws = new WebSocket(page.webSocketDebuggerUrl);
      
      let msgId = 1;
      function send(method, params = {}) {
        const id = msgId++;
        ws.send(JSON.stringify({ id, method, params }));
        return id;
      }

      ws.onopen = () => {
        send('Page.enable');
        send('Page.addScriptToEvaluateOnNewDocument', {
          source: `
            localStorage.setItem('aotms_token', ${JSON.stringify(token)});
            localStorage.setItem('aotms_user', ${JSON.stringify(userStr)});
          `
        });
        send('Page.navigate', { url: 'http://localhost:3000/task' });
      };

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.method === 'Page.loadEventFired') {
          setTimeout(() => {
            send('Runtime.evaluate', { expression: 'window.location.href' });
            const captureId = send('Page.captureScreenshot', { format: 'png' });
            
            ws.onmessage = (ev) => {
              const res2 = JSON.parse(ev.data);
              if (res2.result && res2.result.result && res2.result.result.value) {
                console.log('Current URL in browser:', res2.result.result.value);
              }
              if (res2.id === captureId && res2.result && res2.result.data) {
                const buffer = Buffer.from(res2.result.data, 'base64');
                const outPath = 'C:\\Users\\raman\\.gemini\\antigravity-ide\\brain\\b0f27b67-7fb1-4e47-a0ff-da82d74c4559\\daily_activity_clean_proof.png';
                fs.writeFileSync(outPath, buffer);
                console.log('Saved screenshot successfully to:', outPath);
                chrome.kill();
                process.exit(0);
              }
            };
          }, 3500);
        }
      };
    });
  });
}, 2000);
