const { createProxyMiddleware } = require("http-proxy-middleware");
const BACKEND_URL = process.env.BACKEND_URL || "";
module.exports = function (app) {
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
