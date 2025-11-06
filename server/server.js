import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import { Rooms } from "./rooms.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });
const rooms = new Rooms();

// Serve client
app.use(express.static(path.join(__dirname, "../client")));

io.on("connection", (socket) => {
  let room = "default";
  let user = null;

  socket.on("join", ({ room: wantedRoom, name }) => {
    room = wantedRoom || "default";
    socket.join(room);
    const state = rooms.get(room);
    user = rooms.assignUser(room, socket.id, name);

    // Notify newcomer
    socket.emit("state:init", state.snapshot());

    // Notify others
    socket.to(room).emit("user:join", user);
  });

  socket.on("cursor:move", ({ x, y }) => {
    if (!user) return;
    const state = rooms.get(room);
    state.setCursor(user.id, { x, y });
    socket.to(room).emit("cursor:update", { userId: user.id, x, y });
  });

  // Streaming deltas for smoothness
  socket.on("stroke:segment", (seg) => {
    // seg: { tool, color, width, points:[{x,y}], authorId }
    // forward to others for real-time preview
    socket.to(room).emit("stroke:segment", seg);
  });

  // Commit full stroke at end
  socket.on("stroke:commit", ({ tool, color, width, points }) => {
    if (!user || !Array.isArray(points) || points.length < 1) return;
    const state = rooms.get(room);
    const op = state.commitOp({ tool, color, width, points, author: user });
    io.to(room).emit("op:commit", op);
  });

  socket.on("undo", () => {
    const state = rooms.get(room);
    const op = state.retractLast();
    if (op) io.to(room).emit("op:retract", { id: op.id });
  });

  socket.on("redo", () => {
    const state = rooms.get(room);
    const op = state.reinstateLastRedo();
    if (op) io.to(room).emit("op:reinstate", op);
  });

  socket.on("disconnect", () => {
    if (!user) return;
    const state = rooms.get(room);
    state.removeUser(socket.id);
    socket.to(room).emit("user:leave", { id: user.id });
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
