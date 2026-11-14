// Tiny static server so CSS masks/fonts load (file:// blocks them). Returns {url, close}.
const http = require('http'), fs = require('fs'), path = require('path');
const types = { '.html':'text/html', '.png':'image/png', '.woff2':'font/woff2', '.js':'text/javascript' };
module.exports = () => new Promise(res => {
  const srv = http.createServer((q, r) => {
    const f = path.join(__dirname, decodeURIComponent(q.url.split('?')[0]));
    if (!f.startsWith(__dirname) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
  }).listen(0, '127.0.0.1', () => res({ url: `http://127.0.0.1:${srv.address().port}/careva-explainer.html?render`, close: () => srv.close() }));
});
