import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoleEntity } from './entities/role.entity';
import { UserRoleEntity } from './entities/user-role.entity';
import { UserRoleRepository } from '../user-role.repository';
import { UserRoleRelationalRepository } from './repositories/user-role.repository';

@Module({
  imports: [TypeOrmModule.forFeature([RoleEntity, UserRoleEntity])],
  providers: [
    {
      provide: UserRoleRepository,
      useClass: UserRoleRelationalRepository,
    },
  ],
  exports: [UserRoleRepository, TypeOrmModule],
})
export class RelationalRolePersistenceModule {}
