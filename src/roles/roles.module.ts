import { Module, forwardRef } from '@nestjs/common';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';
import { RolesGuard } from './roles.guard';
import { UserRoleRepository } from './infrastructure/persistence/user-role.repository';
import { UserRoleRelationalRepository } from './infrastructure/persistence/relational/repositories/user-role.repository';
import { RelationalRolePersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';
import { MenusModule } from '../menus/menus.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    RelationalRolePersistenceModule,
    forwardRef(() => MenusModule),
    forwardRef(() => UsersModule),
  ],
  controllers: [RolesController],
  providers: [
    RolesService,
    RolesGuard,
    {
      provide: UserRoleRepository,
      useClass: UserRoleRelationalRepository,
    },
  ],
  exports: [RolesService, RolesGuard, UserRoleRepository],
})
export class RolesModule {}
