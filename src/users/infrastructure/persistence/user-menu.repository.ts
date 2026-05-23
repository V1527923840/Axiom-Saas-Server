export abstract class UserMenuRepository {
  abstract findByUserId(
    userId: number,
  ): Promise<{ menuId: string; expiresAt: Date | null }[]>;

  abstract findValidByUserId(userId: number): Promise<{ menuId: string }[]>;

  abstract assignMenuToUser(
    userId: number,
    menuId: string,
    expiresAt?: Date,
  ): Promise<void>;

  abstract removeMenuFromUser(userId: number, menuId: string): Promise<void>;

  abstract deleteByUserId(userId: number): Promise<void>;
}
