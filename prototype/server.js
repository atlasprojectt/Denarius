// Static server mínimo (sem dependências) para preview do protótipo
const http = require("http");
const fs = require("fs");
const path = require("path");
const ROOT = __dirname;
const TYPES = { ".html":"text/html", ".css":"text/css", ".js":"text/javascript" };
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p === "/") p = "/index.html";
  const file = path.join(ROOT, p);
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end("not found"); return; }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "text/plain",
      "Cache-Control": "no-store" });
    res.end(data);
  });
}).listen(5599, () => console.log("prototype on http://localhost:5599"));
