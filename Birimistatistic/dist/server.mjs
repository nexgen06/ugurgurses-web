import http from 'node:http';

const port = Number(process.env.PORT) || 3000;

const HTML_404 = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>404 Not Found</title>
</head>
<body>
  <h1>404 Not Found</h1>
</body>
</html>
`;

const server = http.createServer((req, res) => {
  res.writeHead(404, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
  });
  res.end(HTML_404);
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Service stopped; listening on ${port} and returning 404 for all routes including login`);
});
