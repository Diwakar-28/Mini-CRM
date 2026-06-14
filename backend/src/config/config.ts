import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

export const config = {
  port: process.env.PORT || 5000,
  databaseUrl: process.env.DATABASE_URL || 'file:./dev.db',
  redisUrl: process.env.REDIS_URL || null,
  geminiApiKey: process.env.GEMINI_API_KEY || null,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || null,
  channelServiceUrl: process.env.CHANNEL_SERVICE_URL || 'http://localhost:5001',
};

// Singleton Prisma Client instance
export const prisma = new PrismaClient({
  log: ['error', 'warn'],
});
