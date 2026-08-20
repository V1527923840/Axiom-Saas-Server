export abstract class UserRoleRepository {
  abstract create(data: { userId: number; roleId: number }): Promise<any>;
  abstract findByUserId(userId: number): Promise<any[]>;
  abstract findByRoleId(roleId: number): Promise<any[]>;
  abstract delete(criteria: {
    userId?: number;
    roleId?: number;
  }): Promise<void>;
  abstract save(entities: any[]): Promise<any[]>;
}
