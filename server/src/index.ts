import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { createAdapter } from '@socket.io/redis-adapter';
import { handleSocketConnection } from './socket';
import { redisClient } from './redis';

const app = express();

// baca CORS origin dari env, bersihkan trailing slash kalau ada
const rawCorsOrigin = process.env.CORS_ORIGIN || process.env.CLIENT_URL || '*';
const corsOrigin = rawCorsOrigin !== '*' && rawCorsOrigin.endsWith('/') 
  ? rawCorsOrigin.slice(0, -1) 
  : rawCorsOrigin;

app.use(cors({ origin: corsOrigin }));
app.use(express.json());

// endpoint health check untuk Railway
app.get('/', (_req, res) => {
  res.json({ status: 'ok', message: 'Memory Hack Server is running' });
});

const httpServer = createServer(app);

const startServer = async () => {
  const io = new Server(httpServer, {
    cors: {
      origin: corsOrigin,
      methods: ['GET', 'POST'],
    },
  });

  if (redisClient) {
    try {
      await redisClient.connect();
      const subClient = redisClient.duplicate();
      await subClient.connect();
      
      // pakai redis adapter supaya bisa multi-instance (horizontal scaling)
      io.adapter(createAdapter(redisClient, subClient));
      console.log('Redis adapter aktif');
    } catch (err) {
      console.error('Gagal koneksi ke Redis:', err);
    }
  } else {
    console.log('REDIS_URL tidak ada, pakai in-memory adapter');
  }

  io.on('connection', (socket) => {
    handleSocketConnection(io, socket);
  });

  const PORT = process.env.PORT || 3001;

  httpServer.listen(PORT, () => {
    console.log(`Server berjalan di port ${PORT}`);
    console.log(`CORS origin: ${corsOrigin}`);
  });
};

startServer().catch(console.error);
