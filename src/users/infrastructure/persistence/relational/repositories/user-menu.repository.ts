import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';
import { UserMenuEntity } from '../entities/user-menu.entity';
import { UserMenuRepository } from '../../user-menu.repository';

@Injectable()
export class UserMenuRelationalRepository implements UserMenuRepository {
  constructor(
    @InjectRepository(UserMenuEntity)
    private readonly userMenuRepository: Repository<UserMenuEntity>,
  ) {}

  async findByUserId(
    userId: number,
  ): Promise<{ menuId: string; expiresAt: Date | null }[]> {
    const entities = await this.userMenuRepository.find({
      where: { userId },
      select: ['menuId', 'expiresAt'],
    });
    return entities.map((e) => ({ menuId: e.menuId, expiresAt: e.expiresAt }));
  }

  async findValidByUserId(userId: number): Promise<{ menuId: string }[]> {
    // Find menus that are either permanent (expiresAt IS NULL) or not yet expired
    const entities = await this.userMenuRepository
      .createQueryBuilder('userMenu')
      .where('userMenu.userId = :userId', { userId })
      .andWhere('userMenu.expiresAt IS NULL OR userMenu.expiresAt > NOW()')
      .select(['userMenu.menuId'])
      .getMany();

    return entities.map((e) => ({ menuId: e.menuId }));
  }

  async assignMenuToUser(
    userId: number,
    menuId: string,
    expiresAt?: Date,
  ): Promise<void> {
    // Upsert: delete existing if present, then insert new
    await this.userMenuRepository.delete({ userId, menuId });

    const userMenu = new UserMenuEntity();
    userMenu.userId = userId;
    userMenu.menuId = menuId;
    userMenu.expiresAt = expiresAt ?? null;

    await this.userMenuRepository.save(userMenu);
  }

  async removeMenuFromUser(userId: number, menuId: string): Promise<void> {
    await this.userMenuRepository.delete({ userId, menuId });
  }
}
