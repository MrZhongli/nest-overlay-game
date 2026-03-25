import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';

// Modules
import { PrismaModule } from './prisma/prisma.module';
import { QuestionsModule } from './modules/questions/questions.module';
import { GameModule } from './modules/game/game.module';
import { LifelinesModule } from './modules/lifelines/lifelines.module';
import { WebsocketModule } from './modules/websocket/websocket.module';
import { AdminModule } from './modules/admin/admin.module';

// Guards & Filters
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

@Module({
  imports: [
    // Configuración global de variables de entorno
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Core
    PrismaModule,

    // Feature modules
    QuestionsModule,
    GameModule,
    LifelinesModule,
    WebsocketModule,

    // Auth & Admin
    AdminModule,
  ],
  providers: [
    // Guard global JWT - todas las rutas protegidas por defecto
    // Usar @Public() para rutas públicas (overlay OBS)
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // Filtro global de excepciones
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    // ValidationPipe global
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,         // Elimina propiedades no declaradas en el DTO
        forbidNonWhitelisted: true, // Lanza error si hay propiedades extra
        transform: true,          // Transforma tipos automáticamente
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    },
  ],
})
export class AppModule {}
