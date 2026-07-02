import http from 'http';
import { createApp } from './app';
import { env } from './config/env';
import { connectPrisma, disconnectPrisma, prisma } from './config/prisma';
import { disconnectRedis } from './config/redis';
import { initSocket } from './realtime/socket';

async function bootstrap() {
  await connectPrisma();

  // Optional dev convenience: seed if the DB is empty and SEED_ON_START=true.
  if (env.seedOnStart) {
    const userCount = await prisma.user.count();
    if (userCount === 0) {
      console.log('[seed] empty database detected — seeding demo data…');
      const { runSeed } = await import('../prisma/seed');
      await runSeed();
    } else {
      console.log('[seed] database already populated — skipping seed.');
    }
  }

  const app = createApp();
  const server = http.createServer(app);
  initSocket(server);

  server.listen(env.port, () => {
    console.log(`\n🌊 PollWave API listening on http://localhost:${env.port}`);
    console.log(`   Swagger docs at http://localhost:${env.port}/docs\n`);
  });

  const shutdown = async (signal: string) => {
    console.log(`\n[${signal}] shutting down…`);
    server.close();
    await Promise.allSettled([disconnectPrisma(), disconnectRedis()]);
    process.exit(0);
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch((err) => {
  console.error('[fatal] failed to start server', err);
  process.exit(1);
});
