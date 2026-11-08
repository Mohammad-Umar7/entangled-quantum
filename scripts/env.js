// Load .env.local into process.env for local scripts (no dependency on dotenv).
const fs = require("fs");
const path = require("path");

for (const name of [".env.local", ".env"]) {
  const p = path.join(__dirname, "..", name);
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
