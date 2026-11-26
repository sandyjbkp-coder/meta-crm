if (process.env.NETLIFY) {
  process.exit(0);
}

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from './config/env.js';
import { getDb, initModels, isPostgres } from './db/connection.js';
import { migrate, migratePg } from './db/migrate.js';
import { authMiddleware } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';
import { generalLimiter } from './middleware/rateLimit.js';
import authRoutes from './routes/auth.js';
import leadsRoutes from './routes/leads.js';
import metaRoutes from './routes/meta.js';
import oauthRoutes from './routes/oauth.js';
import capiRoutes from './routes/capi.js';
import dashboardRoutes from './routes/dashboard.js';
import notificationsRoutes from './routes/notifications.js';
import usersRoutes from './routes/users.js';

const app = express();
app.use(express.json());
app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(helmet());
app.use(morgan('dev'));
app.use(generalLimiter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'meta-crm', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/meta', metaRoutes);
app.use('/api/meta', oauthRoutes);
app.use('/api/meta', capiRoutes);

app.use('/api/leads', authMiddleware, leadsRoutes);
app.use('/api/dashboard', authMiddleware, dashboardRoutes);
app.use('/api/notifications', authMiddleware, notificationsRoutes);
app.use('/api/users', authMiddleware, usersRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || env.PORT;

async function start() {
  try {
    if (!isPostgres()) {
      const dbDir = path.dirname(env.DB_FILE);
      if (dbDir && dbDir !== '.' && !fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }
    }

    initModels();
    migrate();

    if (isPostgres()) {
      await migratePg();
    }

    if (env.DEMO_MODE) {
      const db = getDb();
      const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
      if (userCount === 0) {
        const { default: seed } = await import('./db/seed.js');
        await seed();
        console.log('[BOOT] Demo seed executed');
      }
    }

    if (!process.env.NETLIFY) {
      app.listen(PORT, () => {
        console.log(`[BOOT] Meta CRM Server listening on port ${PORT}`);
        console.log(`[BOOT] Environment: ${env.NODE_ENV}`);
        console.log(`[BOOT] Database: ${isPostgres() ? 'PostgreSQL' : 'SQLite'}`);
      });
    }

  } catch (err) {
    console.error('[BOOT] Failed to start:', err);
    if (!process.env.NETLIFY) {
      process.exit(1);
    }
  }
}

start();

export { app };
