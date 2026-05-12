import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MenuEntity } from './entities/menu.entity';
import { RoleMenuEntity } from './entities/role-menu.entity';
import { MenuRepository } from '../menu.repository';
import { MenuRelationalRepository } from './repositories/menu.repository';

@Module({
  imports: [TypeOrmModule.forFeature([MenuEntity, RoleMenuEntity])],
  providers: [
    {
      provide: MenuRepository,
      useClass: MenuRelationalRepository,
    },
  ],
  exports: [MenuRepository],
})
export class RelationalMenuPersistenceModule {}
