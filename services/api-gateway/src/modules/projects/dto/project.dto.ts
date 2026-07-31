import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

const PROJECT_STATUSES = ['ACTIVE', 'SUSPENDED', 'CLOSED'] as const;

export class CreateProjectDto {
  /** Reprend la longueur de `projects.name` en base (varchar(160)). */
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  locationGps?: string;

  @IsOptional()
  @IsString()
  @IsIn(PROJECT_STATUSES)
  status?: (typeof PROJECT_STATUSES)[number];

  /**
   * Auteur de l'ouverture, tracé au journal d'audit.
   *
   * Fourni par le client, comme `actorId`/`creatorId`/`validatorId` sur les
   * autres écritures. Le sujet du JWT serait la source fiable, mais le guard ne
   * l'expose pas encore sur la requête — à reprendre avec le guard fail-closed.
   */
  @IsString()
  @IsNotEmpty()
  actorId!: string;
}
