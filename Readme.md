# 🎨 Collaborative Canvas

A real-time multi-user drawing board built with **Vanilla JS + Node.js + Socket.IO**.  
Multiple users can draw simultaneously on a shared canvas with synchronized strokes, cursors, and a global undo/redo history.

---

## 🚀 Setup

```bash
git clone https://github.com/arghabanerjee54/Collaborative-Canvas-FLAM.git
cd collaborative-canvas
npm install
npm start
```
## 🧑‍🤝‍🧑 Testing with Multiple Users

1. Run:

   ```bash
   npm start
   ```
2. **Open the application**  
   Visit [http://localhost:3000](http://localhost:3000) in **two or more browser tabs**,  
   or use **different devices** connected to the same Wi-Fi network.

3. **Join a session**  
   Enter a **room name** and **nickname**, then click **Join**.

4. **Start drawing**  
   Use the **Brush** or **Eraser** tool — all connected users will see your strokes instantly.

5. **Try undo/redo**  
   - Press **Ctrl + Z** to undo the last stroke.  
   - Press **Ctrl + Y** to redo it.

6. **See who’s online**  
     View the list of connected users in the room.

## ✨ Features

- ⚡ **Real-time synchronized drawing**
- 🖌️ **Brush**, **eraser**, color, and stroke width tools
- 🔁 **Global undo/redo** (applies to all users)
- 👆 **Live cursor indicators**
- 💡 **Modern light-themed UI** with floating toolbar
- 📱 **Collapsible sidebar** showing online participants

## ⚙️ Tech Stack

| **Layer** | **Technology** |
|------------|----------------|
| Frontend | Vanilla JavaScript, HTML5 Canvas, CSS |
| Real-time Communication | Socket.IO (client-side only) |
| Protocol | WebSocket (event-based) |
| UI/UX | Modern light theme with floating toolbar |


## 🧩 Known Limitations

- Undo/redo becomes slightly slower when a large number of strokes (around 1000+) are drawn since all operations are replayed.
- Canvas state resets after refreshing or closing the tab (no save or persistence yet).
- Mobile/touch drawing is supported but not fully optimized.
- Minor eraser overlap artifacts can appear until the next repaint.

---

## 🕒 Time Spent

| **Phase** | **Duration** | **Notes** |
|------------|--------------|-----------|
| Project setup | 1 hr | Initial structure and folder organization |
| Canvas & smoothing | 3 hrs | Layer creation and stroke optimization |
| Real-time sync (client-side) | 3 hrs | Live drawing and event handling with Socket.IO |
| Global undo/redo | 2 hrs | Timeline logic and repaint strategy |
| UI & styling | 3 hrs | Light theme, toolbar, and sidebar improvements |
| Documentation | 1 hr | README and architecture diagrams |

**Total Time:** ~13 hours

