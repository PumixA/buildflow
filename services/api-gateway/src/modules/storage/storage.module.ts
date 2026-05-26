import { Module } from '@nestjs/common';
import { WormStorageAdapter } from './worm-storage.adapter';

@Module({
  providers: [WormStorageAdapter],
  exports: [WormStorageAdapter]
})
export class StorageModule {}
