import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { MealsModule } from './meals/meals.module';
import { CatalogModule } from './catalog/catalog.module';
import { NutritionModule } from './nutrition/nutrition.module';
import { LabelScanModule } from './label-scan/label-scan.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    MealsModule,
    CatalogModule,
    NutritionModule,
    LabelScanModule,
  ],
})
export class AppModule {}
