import type { Response } from "express";

// A simple in-memory store for active SSE clients
let clients: { id: number; res: Response }[] = [];

export function addClient(res: Response) {
  const clientId = Date.now();
  const newClient = { id: clientId, res };
  clients.push(newClient);
  console.log(`[SSE] Client connected: ${clientId}. Total clients: ${clients.length}`);

  // Set headers for SSE
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  // Initial message to confirm connection
  res.write(`data: ${JSON.stringify({ message: "SSE connection established" })}\n\n`);

  // Remove client on connection close
  res.on("close", () => {
    clients = clients.filter((client) => client.id !== clientId);
    console.log(`[SSE] Client disconnected: ${clientId}. Total clients: ${clients.length}`);
  });
}

export function broadcast(data: unknown) {
  if (clients.length === 0) {
    return;
  }
  
  console.log(`[SSE] Broadcasting data to ${clients.length} client(s)`);
  const message = `data: ${JSON.stringify(data)}\n\n`;
  
  for (const client of clients) {
    client.res.write(message);
  }
}
