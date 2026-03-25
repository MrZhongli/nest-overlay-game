import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // CORS habilitado para OBS y panel admin
  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT'],
    credentials: true,
  });

  // Prefijo global de la API
  app.setGlobalPrefix('api/v1');

  const port = process.env.PORT ?? 3001;
  await app.listen(port);

  logger.log(`🚀 Game Overlay API running on: http://localhost:${port}/api/v1`);
  logger.log(`🎮 WebSocket Gateway available at: ws://localhost:${port}/ws/game`);
}

bootstrap();
