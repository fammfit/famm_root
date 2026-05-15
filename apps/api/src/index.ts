import { serve } from "@hono/node-server";
import app from "./app";

const port = parseInt(process.env["PORT"] ?? "4000");

console.warn(`[api] Starting on port ${port} (${process.env["NODE_ENV"] ?? "development"})`);

serve({ fetch: app.fetch, port }, () => {
  console.warn(`[api] Listening at http://localhost:${port}`);
});
