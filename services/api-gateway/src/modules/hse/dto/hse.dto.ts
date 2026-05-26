import { IsIn, IsISO8601, IsNotEmpty, IsOptional, IsString } from 'class-validator';

const INCIDENT_SEVERITIES = ['MINOR', 'MAJOR', 'CRITICAL'] as const;

export class CreateIncidentDto {
  @IsString()
  @IsNotEmpty()
  projectId!: string;

  @IsString()
  @IsNotEmpty()
  creatorId!: string;

  @IsString()
  @IsNotEmpty()
  type!: string;

  @IsString()
  @IsIn(INCIDENT_SEVERITIES)
  severity!: (typeof INCIDENT_SEVERITIES)[number];

  @IsString()
  @IsNotEmpty()
  description!: string;
}

export class CreateActionDto {
  @IsString()
  @IsNotEmpty()
  incidentId!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsString()
  @IsNotEmpty()
  responsibleId!: string;

  @IsOptional()
  @IsISO8601()
  deadline?: string;
}
