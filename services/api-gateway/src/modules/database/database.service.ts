import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool, QueryResult } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly pool: Pool | null;

  constructor() {
    const databaseUrl = process.env.DATABASE_URL;
    this.pool = databaseUrl
      ? new Pool({
          connectionString: databaseUrl
        })
      : null;
  }

  get enabled(): boolean {
    return this.pool !== null;
  }

  async query(sql: string, values: unknown[] = []): Promise<QueryResult<Record<string, unknown>>> {
    if (!this.pool) {
      throw new Error('DATABASE_URL non configuré');
    }
    return this.pool.query(sql, values);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
    }
  }
}
