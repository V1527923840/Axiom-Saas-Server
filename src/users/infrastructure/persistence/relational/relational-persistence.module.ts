import { Module } from '@nestjs/common';
import { UserRepository } from '../user.repository';
import { UsersRelationalRepository } from './repositories/user.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from './entities/user.entity';
import { UserMenuEntity } from './entities/user-menu.entity';
import { UserMenuRepository } from '../user-menu.repository';
import { UserMenuRelationalRepository } from './repositories/user-menu.repository';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, UserMenuEntity])],
  providers: [
    {
      provide: UserRepository,
      useClass: UsersRelationalRepository,
    },
    {
      provide: UserMenuRepository,
      useClass: UserMenuRelationalRepository,
    },
  ],
  exports: [UserRepository, UserMenuRepository],
})
export class RelationalUserPersistenceModule {}
