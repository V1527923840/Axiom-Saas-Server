import { Module } from '@nestjs/common';
import { UserRepository } from '../user.repository';
import { UsersRelationalRepository } from './repositories/user.repository';
import { UserMenuRepository } from '../user-menu.repository';
import { UserMenuRelationalRepository } from './repositories/user-menu.repository';
import { UserRoleRepository } from '../user-role.repository';
import { UserRoleRelationalRepository } from './repositories/user-role.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from './entities/user.entity';
import { UserMenuEntity } from './entities/user-menu.entity';
import { UserRoleEntity } from '../../../../roles/infrastructure/persistence/relational/entities/user-role.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, UserMenuEntity, UserRoleEntity]),
  ],
  providers: [
    {
      provide: UserRepository,
      useClass: UsersRelationalRepository,
    },
    {
      provide: UserMenuRepository,
      useClass: UserMenuRelationalRepository,
    },
    {
      provide: UserRoleRepository,
      useClass: UserRoleRelationalRepository,
    },
  ],
  exports: [UserRepository, UserMenuRepository, UserRoleRepository],
})
export class RelationalUserPersistenceModule {}
