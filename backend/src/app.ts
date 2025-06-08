// server.ts
import express from "express";
import { createServer } from "http";
import type { IncomingMessage } from "http";
import url from "url";
import Socket from "./websoket/socket";
import dotenv from "dotenv";

const app = express();
const server = createServer(app);
dotenv.config();

// Serve test endpoint
app.get("/", (req, res) => {
  res.send("✅ HTTP server is running");
});

const websocket = new Socket();


// Handle upgrade requests to `/ws`
server.on("upgrade", (request: IncomingMessage, socket, head) => {
  const { pathname } = url.parse(request.url!);
  if (pathname === "/ws") {
    console.log("hitting");
     websocket.handleUpgrade(request,socket,head)
  } else {
    socket.destroy(); // Not handled
  }
});

server.listen(3000, () => {
  console.log("🚀 Server listening on http://localhost:3000");
});
