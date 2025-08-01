import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AppModule } from './app.module';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  // Create app first to get Winston logger
  const app = await NestFactory.create(AppModule);

  // Use Winston logger for all application logging
  const winstonLogger = app.get(WINSTON_MODULE_NEST_PROVIDER);
  app.useLogger(winstonLogger);

  winstonLogger.log('Starting TekAI Context Engine application bootstrap', 'Bootstrap');

  // Get configuration service
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');

  winstonLogger.log('Configuration loaded', 'Bootstrap');
  winstonLogger.log({
    port: port.toString(),
    nodeEnv,
    hasWinstonLogger: true
  }, 'Bootstrap');

  // Global exception filter for comprehensive error logging
  app.useGlobalFilters(app.get(AllExceptionsFilter));
  winstonLogger.log('Global exception filter registered', 'Bootstrap');

  // Global logging interceptor for request/response logging
  app.useGlobalInterceptors(app.get(LoggingInterceptor));
  winstonLogger.log('Global logging interceptor registered', 'Bootstrap');

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  winstonLogger.log('Global validation pipe registered', 'Bootstrap');

  // CORS configuration
  const corsOrigins = nodeEnv === 'development' ? true : process.env.ALLOWED_ORIGINS?.split(',');
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });
  winstonLogger.log('CORS configuration applied', 'Bootstrap');
  winstonLogger.log({
    nodeEnv,
    corsOrigins: nodeEnv === 'development' ? 'development (all origins)' : corsOrigins
  }, 'Bootstrap');

  // API prefix
  app.setGlobalPrefix('api/v1');
  winstonLogger.log('Global API prefix set to: api/v1', 'Bootstrap');

  // Swagger documentation
  if (nodeEnv === 'development') {
    winstonLogger.log('Setting up Swagger documentation for development environment', 'Bootstrap');

    const config = new DocumentBuilder()
      .setTitle('TekAI Context Engine API')
      .setDescription('Production-ready Context Engine for LLM with project-based structure')
      .setVersion('2.0.0')
      .addBearerAuth()
      .addTag('projects', 'Project management operations')
      .addTag('codebases', 'Codebase management operations')
      .addTag('sync', 'Synchronization operations')
      .addTag('files', 'File operations')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);

    winstonLogger.log('Swagger documentation setup completed at: /api/docs', 'Bootstrap');
  }

  await app.listen(port);

  winstonLogger.log('TekAI Context Engine started successfully', 'Bootstrap');
  winstonLogger.log({
    port: port.toString(),
    nodeEnv,
    url: `http://localhost:${port}`,
    apiPrefix: 'api/v1',
    docsUrl: nodeEnv === 'development' ? `http://localhost:${port}/api/docs` : 'disabled',
    timestamp: new Date().toISOString()
  }, 'Bootstrap');

  console.log(`🚀 TekAI Context Engine is running on: http://localhost:${port}`);
  if (nodeEnv === 'development') {
    console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
  }
}

bootstrap().catch((error) => {
  console.error('❌ Error starting the application:', error);
  process.exit(1);
});
