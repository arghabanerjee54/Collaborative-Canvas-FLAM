import { Wire } from "./websocket.js";
import { CanvasView } from "./canvas.js";

const base = document.getElementById("base");
const temp = document.getElementById("temp");
const curs = document.getElementById("cursors");
const view = new CanvasView(base, temp, curs);

const usersEl = document.getElementById("users");
const toolEl = document.getElementById("tool");            // hidden select
const colorEl = document.getElementById("color");
const widthEl = document.getElementById("width");
const undoBtn = document.getElementById("undo");
const redoBtn = document.getElementById("redo");
const latencyEl = document.getElementById("latency");
const roomEl = document.getElementById("room");
const nameEl = document.getElementById("name");
const joinBtn = document.getElementById("join");

// ✅ these were missing
const toggleSidebarBtn = document.getElementById("toggleSidebar");
const toolButtons = Array.from(document.querySelectorAll(".tool-btn"));

const wire = new Wire();
wire.connect();

let myId = null;

/* ---- sidebar toggle ---- */
toggleSidebarBtn?.addEventListener("click", () => {
  document.body.classList.toggle("sidebar-collapsed");
});

/* ---- default tool (Brush) ---- */
if (toolEl) {
  toolEl.value = "brush";
  view.setTool("brush");
  toolButtons.forEach(b => b.classList.toggle("active", b.dataset.tool === "brush"));
}

/* ---- tool select -> view ---- */
toolEl?.addEventListener("change", e => {
  const val = e.target.value;
  view.setTool(val);
  toolButtons.forEach(b => b.classList.toggle("active", b.dataset.tool === val));
});

/* ---- icon buttons -> select ---- */
toolButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    if (!toolEl) return;
    toolEl.value = btn.dataset.tool;
    toolEl.dispatchEvent(new Event("change"));
  });
});

/* ---- color / width ---- */
colorEl?.addEventListener("change", e => view.setColor(e.target.value));
widthEl?.addEventListener("input", e => view.setWidth(e.target.value));

/* ---- undo / redo ---- */
undoBtn?.addEventListener("click", () => wire.emit("undo"));
redoBtn?.addEventListener("click", () => wire.emit("redo"));

/* ---- join ---- */
joinBtn?.addEventListener("click", () => {
  const room = (roomEl?.value || "").trim() || "default";
  const name = (nameEl?.value || "").trim();
  wire.join(room, name);
});

/* ---- keyboard shortcuts ---- */
document.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.key.toLowerCase() === "z") { e.preventDefault(); wire.emit("undo"); }
  if (e.ctrlKey && e.key.toLowerCase() === "y") { e.preventDefault(); wire.emit("redo"); }
});

/* ---- auto-join ---- */
window.addEventListener("load", () => {
  const room = (roomEl?.value || "").trim() || "default";
  const name = (nameEl?.value || "").trim();
  wire.join(room, name);
});

/* ---------------- wire events (unchanged) ---------------- */
wire.on("connect", () => { myId = wire.socket.id; });
wire.on("state:init", (state) => {
  view.ops = state.ops;
  view.setUsers(state.users);
  renderUsers();
  view.repaintFromOps(view.ops);
});
wire.on("user:join", (u) => { view.addUser(u); renderUsers(); });
wire.on("user:leave", ({ id }) => { view.removeUser(id); renderUsers(); });

wire.on("cursor:update", ({ userId, x, y }) => view.updateCursor(userId, x, y));
wire.on("stroke:segment", (seg) => view.drawPreview(seg));
wire.on("op:commit", (op) => { view.ops.push(op); view.commitToBase(op); });

wire.on("op:retract", ({ id }) => {
  const op = view.ops.find(o => o.id === id);
  if (op) { op.retracted = true; view.repaintFromOps(view.ops); }
});
wire.on("op:reinstate", (op) => {
  const idx = view.ops.findIndex(o => o.id === op.id);
  if (idx >= 0) view.ops[idx].retracted = false; else view.ops.push(op);
  view.repaintFromOps(view.ops);
});

/* ---- latency ---- */
setInterval(() => wire.ping(ms => { if (latencyEl) latencyEl.textContent = `${ms} ms`; }), 3000);

/* ---- canvas input -> network ---- */
view.bindInput({
  onSegment: (seg) => wire.emit("stroke:segment", { ...seg, authorId: myId }),
  onCommit:  (full) => wire.emit("stroke:commit", full),
  onCursor:  (pt)   => wire.emit("cursor:move", pt),
});

function renderUsers(){
  if (!usersEl) return;
  usersEl.innerHTML = "";
  for (const u of view.users.values()) {
    const li = document.createElement("li"); li.className="user";
    const dot = document.createElement("span"); dot.className="badge"; dot.style.background = u.color;
    const name = document.createElement("span"); name.textContent = u.name || u.id;
    li.append(dot, name);
    usersEl.appendChild(li);
  }
}
