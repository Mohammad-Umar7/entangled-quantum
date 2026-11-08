// Local dev server: serves public/ and routes /api/* to the Vercel functions,
// so the whole app runs locally with `node scripts/dev.js` (port 3000).
require("./env");
const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");

const ROOT = path.join(__dirname, "..", "public");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".wav": "audio/wav", ".mp4": "video/mp4", ".ico": "image/x-icon" };
const PORT = Number(process.env.PORT || 3000);

http.createServer(async (req, res) => {
  const u = url.parse(req.url, true);
  if (u.pathname.startsWith("/api/")) {
    const name = u.pathname.slice(5).replace(/[^\w-]/g, "");
    const file = path.join(__dirname, "..", "api", `${name}.js`);
    if (!fs.existsSync(file)) { res.statusCode = 404; return res.end("no such function"); }
    req.query = u.query;
    try { await require(file)(req, res); } catch (e) { res.statusCode = 500; res.end(String(e)); }
    return;
  }
  let p = path.normalize(path.join(ROOT, decodeURIComponent(u.pathname)));
  if (!p.startsWith(ROOT)) { res.statusCode = 403; return res.end(); }
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, "index.html");
  if (!fs.existsSync(p)) { res.statusCode = 404; return res.end("not found"); }
  res.setHeader("Content-Type", TYPES[path.extname(p)] || "application/octet-stream");
  fs.createReadStream(p).pipe(res);
}).listen(PORT, () => console.log(`Entangled dev server on http://localhost:${PORT}`));
