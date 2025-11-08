import express from "express";
import http from "http";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { Server } from "socket.io";
import { Rooms } from "./rooms.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const c1 = path.resolve(__dirname, "..", "Client");
const c2 = path.resolve(__dirname, "..", "client");
const publicDir = fs.existsSync(c1) ? c1 : c2;

app.use(express.static(publicDir, { index: "index.html", extensions: ["html"] }));
app.get("/", (_req, res) => res.sendFile(path.join(publicDir, "index.html")));
app.get("/health", (_req, res) => res.json({ ok: true }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(",").map(s => s.trim())
      : true,
    methods: ["GET", "POST"],
  },
  transports: ["websocket", "polling"],
});

const rooms = new Rooms();

io.on("connection", (socket) => {
  let room = "default";
  let user = null;

  socket.on("join", ({ room: wantedRoom, name }) => {
    room = (wantedRoom && String(wantedRoom).trim()) || "default";
    socket.join(room);
    const state = rooms.get(room);
    user = rooms.assignUser(room, socket.id, name);
    socket.emit("state:init", state.snapshot());
    socket.to(room).emit("user:join", user);
  });

  socket.on("cursor:move", ({ x, y }) => {
    if (!user) return;
    const nx = Number(x), ny = Number(y);
    if (!Number.isFinite(nx) || !Number.isFinite(ny)) return;
    const state = rooms.get(room);
    state.setCursor(user.id, { x: nx, y: ny });
    socket.to(room).emit("cursor:update", { userId: user.id, x: nx, y: ny });
  });

  socket.on("stroke:segment", (seg) => {
    if (!user || !seg || !Array.isArray(seg.points)) return;
    socket.to(room).emit("stroke:segment", seg);
  });

  socket.on("stroke:commit", ({ tool, color, width, points }) => {
    if (!user || !Array.isArray(points) || points.length === 0) return;
    const w = Math.max(1, Math.min(Number(width) || 1, 64));
    const state = rooms.get(room);
    const op = state.commitOp({
      tool: tool === "eraser" ? "eraser" : "brush",
      color: String(color || "#000000"),
      width: w,
      points,
      author: user,
    });
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

app.use((req, res, next) => {
  if (req.method !== "GET") return next();
  res.sendFile(path.join(publicDir, "index.html"));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
