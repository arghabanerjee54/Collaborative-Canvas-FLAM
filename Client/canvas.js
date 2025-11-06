// Utilities
const dpr = () => Math.max(1, Math.min(2, window.devicePixelRatio || 1));
const lerp = (a,b,t) => a + (b-a)*t;

// Simple smoothing: Chaikin-like
function smooth(points) {
  if (points.length < 3) return points;
  const out = [points[0]];
  for (let i=1; i<points.length-1; i++){
    const p0 = points[i], p1 = points[i+1];
    out.push({ x: lerp(p0.x,p1.x,.25), y: lerp(p0.y,p1.y,.25) });
    out.push({ x: lerp(p0.x,p1.x,.75), y: lerp(p0.y,p1.y,.75) });
  }
  out.push(points[points.length-1]);
  return out;
}

export class CanvasView {
  constructor(baseEl, tempEl, cursorsEl) {
    // canvases
    this.base = baseEl;
    this.temp = tempEl;
    this.cursorLayer = cursorsEl;

    // contexts
    this.bctx = this.base.getContext("2d");
    this.tctx = this.temp.getContext("2d");
    this.cctx = this.cursorLayer.getContext("2d");

    // tool state
    this.tool = "brush";
    this.color = "#111827";
    this.width = 6;

    // drawing state
    this.isDrawing = false;
    this.points = [];
    this.ops = []; // authoritative ops from server

    // users + cursors
    this.users = new Map();             // id -> { id,name,color }
    this.cursorMap = new Map();         // id -> { x,y }

    window.addEventListener("resize", () => this.resize());
    this.resize();
    this.clearAll();
  }

  setUsers(list) {
    this.users = new Map(list.map(u => [u.id, u]));
  }
  addUser(u) { this.users.set(u.id, u); }
  removeUser(id) { this.users.delete(id); }

  setTool(t){ this.tool = t; }
  setColor(c){ this.color = c; }
  setWidth(w){ this.width = +w; }

  screenToCanvas(evt){
    const rect = this.temp.getBoundingClientRect();
    const scaleX = this.temp.width / rect.width;
    const scaleY = this.temp.height / rect.height;
    const x = (evt.clientX - rect.left) * scaleX;
    const y = (evt.clientY - rect.top) * scaleY;
    return { x, y };
  }

  bindInput({ onSegment, onCommit, onCursor }) {
    const down = (e) => {
      this.isDrawing = true;
      this.points = [ this.screenToCanvas(e) ];
      onCursor?.(this.points[0]);
      e.preventDefault();
    };
    const move = (e) => {
      const p = this.screenToCanvas(e);
      onCursor?.(p);
      if (!this.isDrawing) return;
      this.points.push(p);
      const seg = this.points.slice(-5); // small batch for network
      onSegment({
        tool: this.tool, color: this.color, width: this.width,
        points: seg
      });
      this.drawPreview({ tool:this.tool, color:this.color, width:this.width, points: seg });
      e.preventDefault();
    };
    const up = () => {
      if (!this.isDrawing) return;
      this.isDrawing = false;
      const pts = smooth(this.points);
      onCommit({
        tool: this.tool, color: this.color, width: this.width,
        points: pts
      });
      this.commitToBase({ tool:this.tool, color:this.color, width:this.width, points:pts });
      this.points = [];
      this.tctx.clearRect(0,0,this.temp.width,this.temp.height);
    };

    this.temp.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    this.temp.addEventListener("pointerleave", up);
  }

  drawStroke(ctx, { tool, color, width, points }) {
    if (points.length < 2) return;
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = width;
    ctx.strokeStyle = color;
    if (tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
    }
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i=1; i<points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    ctx.stroke();
    ctx.restore();
  }

  drawPreview(seg) {
    this.drawStroke(this.tctx, seg);
  }

  commitToBase(op) {
    this.drawStroke(this.bctx, op);
  }

  // Full replay (used on init / undo / redo)
  repaintFromOps(ops) {
    this.clearAll();
    for (const op of ops) {
      if (!op.retracted) this.commitToBase(op);
    }
  }

  clearAll() {
    this.bctx.clearRect(0,0,this.base.width,this.base.height);
    this.tctx.clearRect(0,0,this.temp.width,this.temp.height);
    this.cctx.clearRect(0,0,this.cursorLayer.width,this.cursorLayer.height);
  }

  resize() {
    const ratio = dpr();
    const wrap = this.base.parentElement.getBoundingClientRect();
    for (const c of [this.base, this.temp, this.cursorLayer]) {
      c.width = Math.floor(wrap.width * ratio);
      c.height = Math.floor(wrap.height * ratio);
      c.style.width = `${wrap.width}px`;
      c.style.height = `${wrap.height}px`;
    }
    // Repaint after resize
    this.repaintFromOps(this.ops || []);
  }

  // Cursor layer
  updateCursor(userId, x, y, color = "#000") {
    // update map
    this.cursorMap.set(userId, { x, y });

    // redraw all cursors
    this.cctx.clearRect(0,0,this.cursorLayer.width,this.cursorLayer.height);
    for (const [uid, cur] of this.cursorMap.entries()) {
      if (!cur) continue;
      this._drawCursor(cur.x, cur.y, (this.users.get(uid)?.color || color));
    }
  }

  _drawCursor(x,y,color){
    this.cctx.save();
    this.cctx.fillStyle = color;
    this.cctx.beginPath();
    this.cctx.arc(x,y,6,0,Math.PI*2);
    this.cctx.fill();
    this.cctx.restore();
  }
}
