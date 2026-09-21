import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname } from "node:path";

const root = resolve("dist/static");
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".txt": "text/plain",
  ".xml": "application/xml",
};
const security = (await readFile(`${root}/_headers`, "utf8"))
  .split("\n")
  .filter((line) =>
    /^  (Content-Security|X-Content|Referrer|Permissions|Strict-Transport)/.test(
      line,
    ),
  );
const redirects = (await readFile(`${root}/_redirects`, "utf8"))
  .trim()
  .split("\n")
  .filter(Boolean)
  .map((line) => line.split(/\s+/));
createServer(async (request, response) => {
  try {
    const url = new URL(request.url, "http://127.0.0.1:3002");
    const path = decodeURIComponent(url.pathname);
    // Preview never sends counters to the production database.
    if (path === "/api/events" && request.method === "POST") {
      response.writeHead(204);
      response.end();
      return;
    }
    const redirect = redirects.find(([from]) => from === path);
    if (redirect) {
      response.writeHead(Number(redirect[2]), {
        Location: redirect[1] + url.search,
      });
      response.end();
      return;
    }
    const target = resolve(root, "." + (path === "/" ? "/index.html" : path));
    if (!target.startsWith(root + "/") || /(?:^|\/)\./.test(path)) {
      response.writeHead(404);
      response.end();
      return;
    }
    let file = target,
      body;
    try {
      body = await readFile(file);
    } catch {
      file = target + ".html";
      try {
        body = await readFile(file);
      } catch {
        response.statusCode = 404;
        file = root + "/404.html";
        body = await readFile(file);
      }
    }
    for (const line of security) {
      const index = line.indexOf(":");
      response.setHeader(
        line.slice(0, index).trim(),
        line.slice(index + 1).trim(),
      );
    }
    response.setHeader(
      "Content-Type",
      types[extname(file)] || "application/octet-stream",
    );
    response.setHeader("Cache-Control", "no-store");
    response.end(body);
  } catch {
    response.writeHead(400);
    response.end();
  }
}).listen(3002, "127.0.0.1", () =>
  console.log("Static preview: http://127.0.0.1:3002"),
);
