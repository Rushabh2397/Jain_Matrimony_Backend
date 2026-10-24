import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configure Cross-Origin Resource Sharing (CORS)
  const corsOriginEnv = process.env.CORS_ORIGIN;
  const defaultAllowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5173',
    'http://localhost:8081',
    'http://localhost:19006',
  ];

  const allowedOrigins = corsOriginEnv
    ? corsOriginEnv.split(',').map((origin) => origin.trim())
    : defaultAllowedOrigins;

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // Allow requests with no origin (e.g. mobile apps, curl, Postman, server-to-server)
      if (!origin) {
        return callback(null, true);
      }

      if (
        allowedOrigins.includes('*') ||
        allowedOrigins.includes(origin) ||
        process.env.NODE_ENV !== 'production'
      ) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'X-Requested-With',
      'Origin',
    ],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strips properties that don't have decorators in the DTO
      forbidNonWhitelisted: true, // Throws an error if unknown fields are sent
      transform: true, // Automatically transforms payloads to DTO instances
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Shwetambar Jain Matrimony API')
    .setDescription(
      'Privacy-first, culturally tailored matrimonial backend application for the Shwetambar Jain community',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT access token',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();

