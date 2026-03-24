import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);

  // 0.0.0.0: telefon / tablet gibi aynı ağdaki cihazların bilgisayara bağlanabilmesi için
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Backend running on http://localhost:${port} (LAN: http://0.0.0.0:${port})`);
}
bootstrap();
