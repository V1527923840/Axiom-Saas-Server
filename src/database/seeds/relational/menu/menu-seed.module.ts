import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MenuSeedService } from './menu-seed.service';
import { MenuEntity } from '../../../../menus/infrastructure/persistence/relational/entities/menu.entity';
import { RoleMenuEntity } from '../../../../menus/infrastructure/persistence/relational/entities/role-menu.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MenuEntity, RoleMenuEntity])],
  providers: [MenuSeedService],
  exports: [MenuSeedService],
})
export class MenuSeedModule {}
