import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoleEntity } from './infrastructure/persistence/relational/entities/role.entity';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,
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
}
