import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRoleEntity } from '../../../../../roles/infrastructure/persistence/relational/entities/user-role.entity';
import { UserRoleRepository } from '../../user-role.repository';

@Injectable()
export class UserRoleRelationalRepository implements UserRoleRepository {
  constructor(
    @InjectRepository(UserRoleEntity)
    private readonly userRoleRepository: Repository<UserRoleEntity>,
  ) {}

  async create(data: {
    userId: number;
    roleId: number;
  }): Promise<UserRoleEntity> {
    const entity = this.userRoleRepository.create(data as any);
    return (await this.userRoleRepository.save(
      entity,
    )) as unknown as UserRoleEntity;
  }

  async findByUserId(userId: number): Promise<UserRoleEntity[]> {
    return this.userRoleRepository.find({ where: { userId } });
  }

  async findByRoleId(roleId: number): Promise<UserRoleEntity[]> {
    return this.userRoleRepository.find({ where: { roleId } });
  }

  async delete(criteria: { userId?: number; roleId?: number }): Promise<void> {
    await this.userRoleRepository.delete(criteria as any);
  }

  async save(entities: UserRoleEntity[]): Promise<UserRoleEntity[]> {
    return this.userRoleRepository.save(entities);
  }
}
