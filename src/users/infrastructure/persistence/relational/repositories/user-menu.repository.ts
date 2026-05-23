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
    const entities = await this.userMenuRepository.find({
      where: { userId },
      select: ['menuId', 'expiresAt'],
    });

    // Filter for non-expired (expiresAt is null or in the future)
    const now = new Date();
    const validMenus = entities.filter(
      (e) =>
        e.expiresAt === null || e.expiresAt === undefined || e.expiresAt > now,
    );

    return validMenus.map((e) => ({ menuId: e.menuId }));
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

  async deleteByUserId(userId: number): Promise<void> {
    await this.userMenuRepository.delete({ userId });
  }
}
