import { IsArray, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min, ArrayMinSize } from 'class-validator';

const NCR_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
const NCR_STATUSES = ['OPEN', 'IN_ANALYSIS', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const;

export class CreateNcrDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsString()
  @IsNotEmpty()
  projectId!: string;

  @IsString()
  @IsNotEmpty()
  creatorId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  photos!: string[];

  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;

  @IsString()
  @IsIn(NCR_PRIORITIES)
  priority!: (typeof NCR_PRIORITIES)[number];
}

export class SetNcrStatusDto {
  @IsString()
  @IsIn(NCR_STATUSES)
  status!: (typeof NCR_STATUSES)[number];

  @IsString()
  @IsNotEmpty()
  actorId!: string;

  @IsOptional()
  @IsString()
  comment?: string;
}

export class AssignNcrTaskDto {
  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsString()
  @IsNotEmpty()
  assigneeId!: string;
}

export class AddClosureProofDto {
  @IsString()
  @IsNotEmpty()
  actorId!: string;

  @IsString()
  @IsNotEmpty()
  fileName!: string;

  @IsString()
  @IsNotEmpty()
  contentType!: string;

  @IsString()
  @IsNotEmpty()
  payloadBase64!: string;
}

export class CloseNcrDto {
  @IsString()
  @IsNotEmpty()
  validatorId!: string;
}
