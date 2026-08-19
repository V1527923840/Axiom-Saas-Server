import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SkillEntity } from './infrastructure/persistence/relational/entities/skill.entity';
import { SkillFileEntity } from './infrastructure/persistence/relational/entities/skill-file.entity';
import { UserSkillBindingEntity } from './infrastructure/persistence/relational/entities/user-skill-binding.entity';
import { SessionSkillMountEntity } from './infrastructure/persistence/relational/entities/session-skill-mount.entity';
import { PlanSkillEntity } from './infrastructure/persistence/relational/entities/plan-skill.entity';

import { SkillRepository } from './infrastructure/persistence/relational/repositories/skill.repository';
import { SkillFileRepository } from './infrastructure/persistence/relational/repositories/skill-file.repository';
import { UserSkillBindingRepository } from './infrastructure/persistence/relational/repositories/user-skill-binding.repository';
import { SessionSkillMountRepository } from './infrastructure/persistence/relational/repositories/session-skill-mount.repository';
import { PlanSkillRepository } from './infrastructure/persistence/relational/repositories/plan-skill.repository';

import { SkillStorageModule } from './infrastructure/storage/skill-storage.module';
import { ToolEndpointWhitelist } from './tool-endpoint-whitelist';

import { MenusModule } from '../menus/menus.module';
import { UsersModule } from '../users/users.module';
import { InternalSkillToolService } from './internal-skill-tool.service';
import { InternalSkillController } from './internal-skill.controller';
import { InternalUserSkillController } from './internal-user-skill.controller';
import { SkillsService } from './skills.service';
import { SkillsController } from './skills.controller';
import { SkillUploadService } from './skill-upload.service';
import { SkillResolverService } from './skill-resolver.service';

/**
 * SkillsModule — owns every Skill-Plaza class that must live in a
 * NestJS DI container.
 *
 * Why this module exists alongside the per-class spec files: every
 * Skill-Plaza controller/service has a `*.spec.ts` that exercises the
 * class in isolation (mocking its collaborators). That works without
 * a module. But once a class is `useFactory`-imported by another
 * module, it MUST be declared here.
 *
 * Wiring (per Task 16 brief):
 *   - Controllers: InternalSkillController (this task) +
 *                   SkillsController (Task 15)
 *   - Services:    InternalSkillToolService + SkillsService +
 *                   SkillUploadService + SkillResolverService
 *   - Providers:   SkillRepository + SkillFileRepository +
 *                   UserSkillBindingRepository + SessionSkillMountRepository +
 *                   PlanSkillRepository + ToolEndpointWhitelist
 *
 * Note: SkillResolverService and SkillUploadService were added in
 * Tasks 12 and 13; this module is the single place that brings the
 * Skill-Plaza graph online for NestJS.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      SkillEntity,
      SkillFileEntity,
      UserSkillBindingEntity,
      SessionSkillMountEntity,
      PlanSkillEntity,
    ]),
    SkillStorageModule,
    // MenuAccessGuard (used by SkillsController) needs UsersService.getUserAllMenus + isSuperAdmin.
    // Both are exported by UsersModule; MenusModule exports MenuAccessGuard itself.
    UsersModule,
    MenusModule,
  ],
  controllers: [
    InternalSkillController,
    InternalUserSkillController,
    SkillsController,
  ],
  providers: [
    SkillRepository,
    SkillFileRepository,
    UserSkillBindingRepository,
    SessionSkillMountRepository,
    PlanSkillRepository,
    ToolEndpointWhitelist,
    InternalSkillToolService,
    SkillsService,
    SkillUploadService,
    SkillResolverService,
  ],
  exports: [
    InternalSkillToolService,
    SkillsService,
    SkillUploadService,
    SkillResolverService,
    ToolEndpointWhitelist,
  ],
})
export class SkillsModule {}
