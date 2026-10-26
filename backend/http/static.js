const fs = require("node:fs");
const path = require("node:path");
const { FRONTEND_DIR } = require("../config");
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8"
};
function serve(request, response) {
  let urlPath;
  try {
    urlPath = request.url === "/" ? "/index.html" : decodeURIComponent(request.url.split("?")[0]);
  } catch {
    response.writeHead(400);
    return response.end("Bad request");
  }
  const filePath = path.join(FRONTEND_DIR, urlPath);
  if (!filePath.startsWith(FRONTEND_DIR + path.sep)) { // защита от /../../secret
    response.writeHead(403);
    return response.end("Forbidden");
  }
  fs.readFile(filePath, (error, content) => {
    if (error) {
      response.writeHead(404);
      return response.end("Not found");
    }
    response.writeHead(200, { "Content-Type": TYPES[path.extname(filePath)] || "application/octet-stream" });
    response.end(content);
  });
}
module.exports = { serve };