import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { json, urlencoded, type Response } from 'express';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';

/** Base64 etiket görüntüsü (ScanLabelDto ~8M) + JSON sarmalayıcı; varsayılan 100kb yetmez. */
const BODY_LIMIT = '15mb';

async function bootstrap() {
  const isProduction = process.env.NODE_ENV === 'production';

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
    logger: isProduction ? ['warn', 'error'] : ['log', 'warn', 'error', 'debug', 'verbose'],
  });
  app.use(json({ limit: BODY_LIMIT }));
  app.use(urlencoded({ extended: true, limit: BODY_LIMIT }));

  const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const prisma = app.get(PrismaService);

  app.getHttpAdapter().get('/health', async (_req, res: Response) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ ok: true, db: 'up', ts: Date.now() });
    } catch {
      res.status(503).json({ ok: false, db: 'down', ts: Date.now() });
    }
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);

  // 0.0.0.0: telefon / tablet gibi aynı ağdaki cihazların bilgisayara bağlanabilmesi için
  await app.listen(port, '0.0.0.0');

  const logger = new Logger('Bootstrap');
  logger.log(`Backend running on http://localhost:${port}`);
}
bootstrap();
