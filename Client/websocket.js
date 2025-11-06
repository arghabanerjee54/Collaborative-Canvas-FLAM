export class Wire {
  constructor() {
    this.socket = null;
    this.latency = 0;
  }
  connect() {
    this.socket = io(); // served from same origin
  }
  join(room, name) { this.socket.emit("join", { room, name }); }
  on(evt, fn) { this.socket.on(evt, fn); }
  emit(evt, data) { this.socket.emit(evt, data); }
  ping(fn) {
    const t0 = performance.now();
    this.socket.timeout(2000).emit("cursor:move", { x:-1, y:-1 }, () => {
      this.latency = Math.round(performance.now() - t0);
      fn(this.latency);
    });
  }
}
