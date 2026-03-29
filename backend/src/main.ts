import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { json, urlencoded, type Response } from 'express';
import { AppModule } from './app.module';

/** Base64 etiket görüntüsü (ScanLabelDto ~8M) + JSON sarmalayıcı; varsayılan 100kb yetmez. */
const BODY_LIMIT = '15mb';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
    logger: ['log', 'warn', 'error', 'debug', 'verbose'],
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

  // DB/Prisma yok — bağlantı testi (listen öncesi Express’e eklenir)
  app.getHttpAdapter().get('/health', (_req, res: Response) => {
    res.json({ ok: true, ts: Date.now() });
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);

  // 0.0.0.0: telefon / tablet gibi aynı ağdaki cihazların bilgisayara bağlanabilmesi için
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Backend running on http://localhost:${port} (LAN: http://0.0.0.0:${port})`);
}
bootstrap();
