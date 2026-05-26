import { Type } from 'class-transformer';
import { IsIn, IsNotEmpty, IsNumber, IsObject, IsString, Min } from 'class-validator';

const RESOLUTION_STRATEGIES = ['LWW', 'MANUAL'] as const;

export class PushSyncDto {
  @IsString()
  @IsNotEmpty()
  localId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  version!: number;

  @IsObject()
  payload!: Record<string, unknown>;
}

export class ResolveSyncDto {
  @IsString()
  @IsNotEmpty()
  localId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  version!: number;

  @IsObject()
  payload!: Record<string, unknown>;

  @IsString()
  @IsIn(RESOLUTION_STRATEGIES)
  strategy!: (typeof RESOLUTION_STRATEGIES)[number];
}
