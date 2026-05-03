import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { handleSocketConnection } from './socket';

const app = express();

const corsOrigin = process.env.CORS_ORIGIN || '*';

app.use(cors({ origin: corsOrigin }));
app.use(express.json());

// Health check endpoint for Railway
app.get('/', (_req, res) => {
  res.json({ status: 'ok', message: 'Memory Hack Server is running 🧠' });
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: corsOrigin,
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  handleSocketConnection(io, socket);
});

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`🚀 Memory Hack server running on port ${PORT}`);
  console.log(`   CORS origin: ${corsOrigin}`);
});
