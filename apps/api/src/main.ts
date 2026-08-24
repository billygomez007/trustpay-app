import 'reflect-metadata';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { parseServerEnvironment } from '@trustpay/config';
import { AppModule } from './app.module.js';

async function bootstrap(): Promise<void> {
  const environment = parseServerEnvironment(process.env);
  const app = await NestFactory.create(AppModule, {
    cors: { origin: environment.WEB_ORIGIN, credentials: true }
  });
  app.setGlobalPrefix('v1');
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      exceptionFactory: (errors) => new BadRequestException(errors)
    })
  );
  await app.listen(environment.API_PORT);
}

void bootstrap();
