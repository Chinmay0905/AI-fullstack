/**
 * Zero-dependency static file server for local testing. Section 9: "The
 * company sites used with this command may be served from a local
 * address, so your retrieval code must not assume a particular host and
 * must follow relative links." This serves test-fixtures/site/ at
 * http://localhost:8099/ so the crawler can be exercised without hitting
 * the real internet.
 */
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "site");
const PORT = process.env.FIXTURE_PORT ? Number(process.env.FIXTURE_PORT) : 8099;

const CONTENT_TYPES = { ".html": "text/html", ".txt": "text/plain" };

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
  if (urlPath.endsWith("/")) urlPath += "index.html";
  const filePath = path.join(ROOT, urlPath);

  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403).end("Forbidden");
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" }).end("Not found");
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { "Content-Type": CONTENT_TYPES[ext] || "application/octet-stream" });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`[fixture-site] serving test-fixtures/site/ at http://localhost:${PORT}/`);
});
