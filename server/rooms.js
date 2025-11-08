import { DrawingState } from "./drawing-state.js";

const COLORS = [
  "#ef4444","#f59e0b","#10b981","#3b82f6",
  "#8b5cf6","#ec4899","#14b8a6","#84cc16"
];

export class Rooms {
  constructor() {
    this.rooms = new Map(); // roomName -> DrawingState
  }
  get(room) {
    if (!this.rooms.has(room)) this.rooms.set(room, new DrawingState());
    return this.rooms.get(room);
  }
  assignUser(room, socketId, name) {
    const state = this.get(room);
    // pick deterministic color by hash of name
    const idx = Math.abs(hashCode(name ?? socketId)) % COLORS.length;
    const user = { id: socketId, name: name || `User-${socketId.slice(0,4)}`, color: COLORS[idx] };
    state.addUser(socketId, user);
    return user;
  }
}

function hashCode(s) {
  let h = 0;
  for (let i=0; i<s.length; i++) h = ((h<<5)-h) + s.charCodeAt(i) | 0;
  return h;
}
