const BACKEND_URL = (process.env.BACKEND_URL || "").replace(/\/$/, "");

const FORWARD_REQUEST_HEADERS = ["content-type", "authorization", "accept"];
const FORWARD_RESPONSE_HEADERS = ["content-type", "content-disposition"];

const readBody = (req) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });

function resolvePath(req) {
  let sub = "";

  // 1. Try req.query.path (if non-empty array or string)
  if (req.query && req.query.path && (!Array.isArray(req.query.path) || req.query.path.length > 0)) {
    const raw = Array.isArray(req.query.path) ? req.query.path.join("/") : String(req.query.path);
    if (raw && raw !== "[...path]") {
      sub = raw;
    }
  }

  // 2. Try req.query.match
  if (!sub && req.query && req.query.match) {
    const raw = Array.isArray(req.query.match) ? req.query.match.join("/") : String(req.query.match);
    if (raw) {
      sub = raw;
    }
  }

  // 3. Fallback to req.url
  if (!sub && req.url) {
    const p = req.url.split("?")[0];
    sub = p.replace(/^\/?(api\/?)?/, "").replace(/^\/+/, "");
  }

  sub = sub.replace(/^\[\.\.\.path\]\/?/, "").replace(/^proxy\/?/, "").replace(/^\/+/, "");

  let queryString = "";
  if (req.url && req.url.includes("?")) {
    const rawSearch = req.url.slice(req.url.indexOf("?") + 1);
    const params = new URLSearchParams(rawSearch);
    params.delete("path");
    params.delete("match");
    const cleaned = params.toString();
    if (cleaned) queryString = `?${cleaned}`;
  }

  return `/api/${sub}${queryString}`;
}

module.exports = async (req, res) => {
  // CORS Preflight
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept");

  if (req.method === "OPTIONS") {
    res.statusCode = 200;
    return res.end();
  }

  try {
    const targetPath = resolvePath(req);
    if (!BACKEND_URL) return res.status(503).json({ error: "MH backend is not configured." });
    const targetUrl = `${BACKEND_URL}${targetPath}`;

    const headers = {};
    FORWARD_REQUEST_HEADERS.forEach((name) => {
      if (req.headers[name]) headers[name] = req.headers[name];
    });

    const hasBody = !["GET", "HEAD"].includes(req.method);
    const body = hasBody ? await readBody(req) : undefined;

    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
    });

    res.statusCode = response.status;
    FORWARD_RESPONSE_HEADERS.forEach((name) => {
      const value = response.headers.get(name);
      if (value) res.setHeader(name, value);
    });

    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    res.statusCode = 502;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ message: "Could not reach the API server", error: error.message }));
  }
};
