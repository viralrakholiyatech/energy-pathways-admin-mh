const { createProxyMiddleware } = require("http-proxy-middleware");
const BACKEND_URL = process.env.BACKEND_URL || "";
const DEFAULT_BACKEND_PATHS = new Set([
  "/api/admin/login",
  "/api/admin/sheets/GDP",
  "/api/admin/sheets/I.a",
  "/api/admin/sheets/I.b",
  "/api/admin/sheets/I.c",
  "/api/admin/sheets/II",
  "/api/admin/sheets/III",
  "/api/admin/sheets/IV.a",
  "/api/admin/sheets/IV.b",
  "/api/admin/sheets/IV.c1",
  "/api/admin/sheets/IV.c2",
  "/api/admin/sheets/IV.d",
  "/api/admin/sheets/IV.e",
  "/api/admin/sheets/V.a",
  "/api/admin/sheets/V.b",
  "/api/admin/sheets/V.c",
  "/api/admin/sheets/VI",
  "/api/admin/sheets/VII.a",
  "/api/admin/sheets/VII.b",
  "/api/admin/sheets/VII.c",
  "/api/admin/sheets/VIII",
  "/api/admin/sheets/X.a",
  "/api/admin/sheets/X.b",
  "/api/admin/sheets/XI",
  "/api/admin/sheets/XII.a",
  "/api/admin/sheets/XII.b",
  "/api/admin/sheets/XIII.a",
  "/api/admin/sheets/XIV",
  "/api/admin/sheets/XV.a",
  "/api/admin/sheets/XV.b",
  "/api/admin/sheets/XV.c",
  "/api/admin/sheets/XVII.a",
  "/api/admin/sheets/XVII.b",
  "/api/admin/upload-excel"
]);

module.exports = function (app) {
  app.use("/api", createProxyMiddleware((path, req) => {
    const requestPath = (req.originalUrl || path).split("?")[0];
    return DEFAULT_BACKEND_PATHS.has(requestPath);
  }, { target: BACKEND_URL || "http://82.112.234.108:3006", changeOrigin: true }));
  if (!BACKEND_URL) { app.use("/api", (req, res) => res.status(503).json({ error: "MH backend is not configured." })); return; }
  app.use(
    "/api",
    createProxyMiddleware({
      target: BACKEND_URL,
      changeOrigin: true,
      onProxyReq: (proxyReq) => {
        proxyReq.removeHeader("origin");
        proxyReq.removeHeader("referer");
      }
    })
  );
};
