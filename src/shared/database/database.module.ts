import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  TekProject,
  DocsBucket,
  Codebase,
  Document
} from '@/entities';
import { IndexJob } from '@/modules/indexing/entities/index-job.entity';

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST', 'localhost'),
        port: configService.get('DB_PORT', 5432),
        username: configService.get('DB_USERNAME', 'postgres'),
        password: configService.get('DB_PASSWORD', 'postgres'),
        database: configService.get('DB_DATABASE', 'tekaicontextengine'),
        entities: [
          TekProject,
          DocsBucket,
          Codebase,
          Document,
          IndexJob,
        ],
        synchronize: configService.get('DB_SYNCHRONIZE', false),
        logging: configService.get('DB_LOGGING', false),
        ssl: configService.get('DB_SSL', false) ? {
          rejectUnauthorized: false,
        } : false,
        extra: {
          max: configService.get('DB_MAX_CONNECTIONS', 20),
          connectionTimeoutMillis: configService.get('DB_CONNECTION_TIMEOUT', 60000),
          idleTimeoutMillis: configService.get('DB_IDLE_TIMEOUT', 60000),
        },
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([
      TekProject,
      DocsBucket,
      Codebase,
      Document,
      IndexJob,
    ]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}