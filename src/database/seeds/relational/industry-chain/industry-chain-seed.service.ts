import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MenuEntity } from '../../../../menus/infrastructure/persistence/relational/entities/menu.entity';
import { RoleMenuEntity } from '../../../../menus/infrastructure/persistence/relational/entities/role-menu.entity';

@Injectable()
export class IndustryChainSeedService {
  constructor(
    @InjectRepository(MenuEntity)
    private readonly menuRepository: Repository<MenuEntity>,
    @InjectRepository(RoleMenuEntity)
    private readonly roleMenuRepository: Repository<RoleMenuEntity>,
  ) {}

  async run(): Promise<void> {
    let menu = await this.menuRepository.findOne({
      where: { code: 'industry-chains' },
    });

    if (!menu) {
      const contentMenu = await this.menuRepository.findOne({
        where: { code: 'content' },
      });
      if (!contentMenu) {
        console.warn('[industry-chain-seed] content menu missing, skipping');
        return;
      }
      menu = this.menuRepository.create({
        name: '产业链',
        code: 'industry-chains',
        icon: 'Factory',
        path: '/content/industry-chains',
        parentId: contentMenu.id,
        sortOrder: 4,
        status: 'active',
      });
      await this.menuRepository.save(menu);
      console.log('[industry-chain-seed] inserted menu industry-chains');
    }

    const adminRoleId = 2;
    const existing = await this.roleMenuRepository.findOne({
      where: { roleId: adminRoleId, menuId: menu.id },
    });
    if (!existing) {
      await this.roleMenuRepository.save(
        this.roleMenuRepository.create({
          roleId: adminRoleId,
          menuId: menu.id,
        }),
      );
      console.log('[industry-chain-seed] assigned to admin role');
    }
  }
}
