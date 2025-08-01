import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

import { DatabaseModule } from './shared/database/database.module';
import { StorageModule } from './shared/storage/storage.module';
import { WorkerPoolModule } from './shared/workers/worker-pool.module';
import { ProjectModule } from './modules/project/project.module';
import { IndexingModule } from './modules/indexing/indexing.module';
import { GitlabModule } from './modules/gitlab/gitlab.module';
import { HealthModule } from './modules/health/health.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';


@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),

    // Logging
    WinstonModule.forRootAsync({
      useFactory: () => {
        return {
          transports: [
            // Console transport (always enabled)
            new winston.transports.Console({
              format: winston.format.combine(
                winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                winston.format.colorize({ all: true }),
                winston.format.printf(({ timestamp, level, message, context }) => {
                  const contextStr = context ? `[${context}] ` : '';
                  return `${timestamp} ${level}: ${contextStr}${message}`;
                }),
              ),
            }),

            // File transport for all logs
            new winston.transports.File({
              filename: 'logs/app.log',
              format: winston.format.combine(
                winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                winston.format.json(),
              ),
            }),

            // Separate file for errors only
            new winston.transports.File({
              filename: 'logs/error.log',
              level: 'error',
              format: winston.format.combine(
                winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                winston.format.json(),
              ),
            }),
          ],
        };
      },
      inject: [],
    }),

    // Database
    DatabaseModule,

    // Storage
    StorageModule,

    // Worker Pools
    WorkerPoolModule,

    // Scheduling
    ScheduleModule.forRoot(),

    // Feature Modules
    ProjectModule,
    IndexingModule, // Pipeline-based indexing system
    GitlabModule,
    HealthModule,
  ],
  providers: [
    AllExceptionsFilter,
    LoggingInterceptor,
  ],
})
export class AppModule {}
