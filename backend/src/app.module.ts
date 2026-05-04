import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CatalogModule } from './catalog/catalog.module';
import { LabelScanModule } from './label-scan/label-scan.module';

/** Uygulama başlarken zorunlu ortam değişkenlerini doğrula; eksik varsa hemen çök. */
const envValidationSchema = Joi.object({
  DATABASE_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().min(16).required(),
  JWT_EXPIRATION: Joi.string().default('7d'),
  GEMINI_API_KEY: Joi.string().required(),
  GEMINI_MODEL: Joi.string().optional(),
  ALLOWED_ORIGINS: Joi.string().optional().default(''),
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().integer().positive().default(3000),
});

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: envValidationSchema,
      validationOptions: { abortEarly: true },
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    CatalogModule,
    LabelScanModule,
  ],
})
export class AppModule {}
