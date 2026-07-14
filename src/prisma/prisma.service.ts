import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor(private readonly configService: ConfigService) {
    const databaseUrl = configService.get<string>('DATABASE_URL');

    if (!databaseUrl) {
      throw new Error('❌ DATABASE_URL environment variable is missing!');
    }

    const pool = new Pool({ connectionString: databaseUrl });
    const adapter = new PrismaPg(pool);

    super({ adapter });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log(
        '🚀 Database connected successfully via Prisma (PostgreSQL)!',
      );
    } catch (error) {
      this.logger.error('❌ Database connection failed!', (error as Error).stack);
      // Fail fast — don't start the app without a database
      process.exit(1);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('🔌 Database disconnected gracefully.');
  }
}
