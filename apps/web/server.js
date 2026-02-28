const http = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3000;
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const API_TARGET = 'localhost';
const API_PORT = 8080;

app.prepare().then(() => {
  const server = http.createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      const { pathname } = parsedUrl;

      // API 代理
      if (pathname.startsWith('/api/')) {
        console.log(`[Proxy] ${req.method} ${req.url}`);
        
        const options = {
          hostname: API_TARGET,
          port: API_PORT,
          path: req.url,
          method: req.method,
          headers: {
            ...req.headers,
            host: `${API_TARGET}:${API_PORT}`,
          },
          timeout: 300000, // 5 分钟
        };

        const proxyReq = http.request(options, (proxyRes) => {
          res.writeHead(proxyRes.statusCode, proxyRes.headers);
          proxyRes.pipe(res, { end: true });
        });

        proxyReq.on('error', (err) => {
          console.error('Proxy request error:', err.message);
          if (!res.headersSent) {
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Proxy error', message: err.message }));
          }
        });

        proxyReq.on('timeout', () => {
          console.error('Proxy request timeout');
          proxyReq.destroy();
          if (!res.headersSent) {
            res.writeHead(504, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Gateway timeout' }));
          }
        });

        req.pipe(proxyReq, { end: true });
        return;
      }

      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // 设置服务器超时
  server.timeout = 300000; // 5 分钟
  server.keepAliveTimeout = 300000;
  server.headersTimeout = 310000;

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> API proxy to http://${API_TARGET}:${API_PORT} with 5min timeout`);
  });
});
