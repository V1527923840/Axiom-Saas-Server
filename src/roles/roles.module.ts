import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';
import { RolesGuard } from './roles.guard';
import { RoleEntity } from './infrastructure/persistence/relational/entities/role.entity';
import { UserRoleEntity } from './infrastructure/persistence/relational/entities/user-role.entity';
import { UserRoleRepository } from '../users/infrastructure/persistence/user-role.repository';
import { UserRoleRelationalRepository } from '../users/infrastructure/persistence/relational/repositories/user-role.repository';
import { MenusModule } from '../menus/menus.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RoleEntity, UserRoleEntity]),
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
  exports: [RolesService, RolesGuard],
})
export class RolesModule {}
