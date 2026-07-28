import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MenuEntity } from '../../../../menus/infrastructure/persistence/relational/entities/menu.entity';
import { RoleMenuEntity } from '../../../../menus/infrastructure/persistence/relational/entities/role-menu.entity';
import { IndustryChainSeedService } from './industry-chain-seed.service';

@Module({
  imports: [TypeOrmModule.forFeature([MenuEntity, RoleMenuEntity])],
  providers: [IndustryChainSeedService],
})
export class IndustryChainSeedModule {}
