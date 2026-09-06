const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOST || 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// roomId -> Map<socketId, { name }>
const rooms = new Map();

function participantsIn(roomId) {
  const room = rooms.get(roomId);
  if (!room) return [];
  return Array.from(room.entries()).map(([id, info]) => ({ id, name: info.name }));
}

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer, {
    path: '/api/signal',
  });

  io.on('connection', (socket) => {
    let currentRoom = null;

    socket.on('join-room', ({ roomId, name }) => {
      if (!roomId || typeof roomId !== 'string') return;
      currentRoom = roomId;
      socket.join(roomId);

      if (!rooms.has(roomId)) rooms.set(roomId, new Map());
      const room = rooms.get(roomId);

      room.set(socket.id, { name: name || 'Guest' });

      // Send an authoritative membership snapshot to every client, including the
      // newcomer, so the visible participant count stays in sync.
      io.to(roomId).emit('room-participants', participantsIn(roomId));

      // Tell everyone else a new peer joined.
      socket.to(roomId).emit('peer-joined', { id: socket.id, name: name || 'Guest' });
    });

    socket.on('signal', ({ to, data }) => {
      if (!to) return;
      io.to(to).emit('signal', { from: socket.id, data });
    });

    socket.on('media-state', ({ roomId, micOn, cameraOn }) => {
      if (!roomId) return;
      socket.to(roomId).emit('media-state', { from: socket.id, micOn, cameraOn });
    });

    socket.on('chat-message', ({ roomId, text, name }) => {
      if (!roomId || !text) return;
      const trimmed = String(text).slice(0, 2000);
      io.to(roomId).emit('chat-message', {
        from: socket.id,
        name: name || 'Guest',
        text: trimmed,
        at: Date.now(),
      });
    });

    socket.on('leave-room', () => {
      handleLeave(socket, currentRoom);
      currentRoom = null;
    });

    socket.on('disconnect', () => {
      handleLeave(socket, currentRoom);
    });
  });

  function handleLeave(socket, roomId) {
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (room) {
      room.delete(socket.id);
      if (room.size === 0) rooms.delete(roomId);
    }
    socket.to(roomId).emit('peer-left', { id: socket.id });
    socket.leave(roomId);
  }

  httpServer.listen(port, () => {
    console.log(`> Relay ready on http://${hostname}:${port}`);
  });
});
