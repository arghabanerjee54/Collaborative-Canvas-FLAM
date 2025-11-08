import { v4 as uuid } from "uuid";

/**
 * RoomState:
 * - ops: [{ id, tool, color, width, points:[{x,y}], author:{id,name,color}, retracted:boolean, ts }]
 * - redo: [opId, ...]
 * - users: Map<socketId, { id, name, color }>
 * - cursors: Map<userId, { x, y, ts }>
 */
export class DrawingState {
  constructor() {
    this.ops = [];
    this.redo = [];
    this.users = new Map();
    this.cursors = new Map();
  }
  snapshot() {
    return {
      ops: this.ops,
      users: Array.from(this.users.values()),
      cursors: Object.fromEntries(this.cursors),
    };
  }
  addUser(socketId, user) {
    this.users.set(socketId, user);
  }
  removeUser(socketId) {
    this.users.delete(socketId);
  }
  setCursor(userId, pt) {
    this.cursors.set(userId, { ...pt, ts: Date.now() });
  }
  commitOp({ tool, color, width, points, author }) {
    const op = {
      id: uuid(),
      tool,
      color,
      width,
      points,
      author,
      retracted: false,
      ts: Date.now(),
    };
    this.ops.push(op);
    this.redo = []; // clear redo on new op
    return op;
  }
  retractLast() {
    for (let i = this.ops.length - 1; i >= 0; i--) {
      if (!this.ops[i].retracted) {
        this.ops[i].retracted = true;
        this.redo.push(this.ops[i].id);
        return this.ops[i];
      }
    }
    return null;
  }
  reinstateLastRedo() {
    const id = this.redo.pop();
    if (!id) return null;
    const op = this.ops.find(o => o.id === id);
    if (op) op.retracted = false;
    return op || null;
  }
}
