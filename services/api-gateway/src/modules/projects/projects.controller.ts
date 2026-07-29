import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { CreateProjectDto } from './dto/project.dto';
import { Project, ProjectsService } from './projects.service';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  /**
   * Sélection du chantier : tous les rôles authentifiés en ont besoin, y compris
   * le chef de chantier qui doit choisir son site avant de saisir une NCR.
   */
  @Get()
  @Roles('CHEF_CHANTIER', 'RESPONSABLE_QSE', 'DIRECTION_TRAVAUX', 'ADMIN')
  async list(): Promise<{ items: Project[]; total: number }> {
    const items = await this.projectsService.list();
    return { items, total: items.length };
  }

  @Get(':projectId')
  @Roles('CHEF_CHANTIER', 'RESPONSABLE_QSE', 'DIRECTION_TRAVAUX', 'ADMIN')
  detail(@Param('projectId') projectId: string): Promise<Project> {
    return this.projectsService.detail(projectId);
  }

  /** Ouvrir un chantier est une décision d'encadrement, pas une action de terrain. */
  @Post()
  @Roles('DIRECTION_TRAVAUX', 'ADMIN')
  create(@Body() payload: CreateProjectDto): Promise<Project> {
    return this.projectsService.create(payload, payload.actorId);
  }
}
