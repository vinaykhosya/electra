import path from "path";
import { createServer } from "./index";
import * as express from "express";

const app = createServer();
const port = process.env.PORT || 3001;
const host = "0.0.0.0"; // Important for hosting platforms like Render

// This path now correctly points to the 'dist' folder inside the 'client' directory,
// where the final built frontend files will be located after the build command runs.
// const __dirname = import.meta.dirname;
const distPath = path.join(__dirname, "../../client/dist");

// Serve static assets (like CSS, JS, images) from that correct directory.
app.use(express.static(distPath));

// This is a "catch-all" route. It handles all other requests by sending the main
// index.html file. This is crucial for single-page applications like React,
// allowing React Router to handle all the page navigation on the client side.
app.use((req, res, next) => {
  // If the request is for an API endpoint, we don't want to serve the HTML file.
  // 'next()' passes the request to the next handler, which is our Express API router.
  if (req.path.startsWith("/api/")) {
    return next();
  }
  // For any other path (e.g., /dashboard, /devices), send the main entry point of your app.
  res.sendFile(path.join(distPath, "index.html"));
});

app.listen(Number(port), host, () => {
  console.log(`🚀 Quantum Haven server running on http://${host}:${port}`);
});

// Graceful shutdown logic (remains the same)
process.on("SIGTERM", () => {
  console.log("🛑 Received SIGTERM, shutting down gracefully");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("🛑 Received SIGINT, shutting down gracefully");
  process.exit(0);
});
