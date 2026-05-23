import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';
import { RoleEntity } from './infrastructure/persistence/relational/entities/role.entity';
import { UserRoleEntity } from './infrastructure/persistence/relational/entities/user-role.entity';
import { MenusModule } from '../menus/menus.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RoleEntity, UserRoleEntity]),
    forwardRef(() => MenusModule),
    forwardRef(() => UsersModule),
  ],
  controllers: [RolesController],
  providers: [RolesService],
  exports: [RolesService],
})
export class RolesModule {}
