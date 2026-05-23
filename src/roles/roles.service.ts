import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoleEntity } from './infrastructure/persistence/relational/entities/role.entity';
import { UserRoleEntity } from './infrastructure/persistence/relational/entities/user-role.entity';
import { CreateRoleDto, UpdateRoleDto } from './dto/role.dto';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,
    @InjectRepository(UserRoleEntity)
    private readonly userRoleRepository: Repository<UserRoleEntity>,
  ) {}

  async findAll(): Promise<RoleEntity[]> {
    return this.roleRepository.find({
      order: { id: 'ASC' },
    });
  }

  async findById(id: number): Promise<RoleEntity | null> {
    return this.roleRepository.findOne({
      where: { id },
    });
  }

  async create(dto: CreateRoleDto): Promise<RoleEntity> {
    const role = this.roleRepository.create({
      name: dto.name,
      code: dto.code,
      description: dto.description,
    } as Partial<RoleEntity>);
    return this.roleRepository.save(role);
  }

  async update(id: number, dto: UpdateRoleDto): Promise<RoleEntity | null> {
    const role = await this.findById(id);
    if (!role) return null;

    if (dto.name !== undefined) role.name = dto.name;
    if (dto.description !== undefined) role.description = dto.description;

    return this.roleRepository.save(role);
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.roleRepository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  async getRoleUserIds(roleId: number): Promise<number[]> {
    const userRoles = await this.userRoleRepository.find({
      where: { roleId },
      select: ['userId'],
    });
    return userRoles.map((ur) => ur.userId);
  }

  async assignUsersToRole(roleId: number, userIds: number[]): Promise<void> {
    // Remove existing assignments
    await this.userRoleRepository.delete({ roleId });

    // Create new assignments
    const userRoles = userIds.map((userId) =>
      this.userRoleRepository.create({ userId, roleId } as UserRoleEntity),
    );
    await this.userRoleRepository.save(userRoles);
  }

  async removeUsersFromRole(roleId: number, userIds: number[]): Promise<void> {
    await this.userRoleRepository.delete({
      roleId,
      userId: userIds.length > 0 ? undefined : undefined,
    } as any);
    // For specific users, use query builder
    if (userIds.length > 0) {
      await this.userRoleRepository
        .createQueryBuilder()
        .delete()
        .where('roleId = :roleId AND userId IN (:...userIds)', {
          roleId,
          userIds,
        })
        .execute();
    }
  }
}
