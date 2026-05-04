import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { createAdapter } from '@socket.io/redis-adapter';
import { handleSocketConnection } from './socket';
import { redisClient } from './redis';

const app = express();

const corsOrigin = process.env.CLIENT_URL || '*';

app.use(cors({ origin: corsOrigin }));
app.use(express.json());

// Health check endpoint for Railway
app.get('/', (_req, res) => {
  res.json({ status: 'ok', message: 'Memory Hack Server is running 🧠' });
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
      
      io.adapter(createAdapter(redisClient, subClient));
      console.log('✅ Redis Adapter initialized');
    } catch (err) {
      console.error('❌ Failed to initialize Redis Adapter', err);
    }
  } else {
    console.log('⚠️ REDIS_URL not provided, falling back to in-memory adapter');
  }

  io.on('connection', (socket) => {
    handleSocketConnection(io, socket);
  });

  const PORT = process.env.PORT || 3001;

  httpServer.listen(PORT, () => {
    console.log(`🚀 Memory Hack server running on port ${PORT}`);
    console.log(`   CORS origin: ${corsOrigin}`);
  });
};

startServer().catch(console.error);
