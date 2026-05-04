import { createClient } from 'redis';

const redisUrl = process.env.REDIS_URL;

export const redisClient = redisUrl ? createClient({ url: redisUrl }) : null;

if (redisClient) {
  redisClient.on('error', (err) => console.error('Redis Client Error', err));
}
