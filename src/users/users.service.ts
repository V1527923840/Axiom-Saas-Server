import {
  HttpStatus,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { NullableType } from '../utils/types/nullable.type';
import { FilterUserDto, SortUserDto } from './dto/query-user.dto';
import { UserRepository } from './infrastructure/persistence/user.repository';
import { UserMenuRepository } from './infrastructure/persistence/user-menu.repository';
import { UserRoleRepository } from './infrastructure/persistence/user-role.repository';
import { PlanMenuRepository } from '../plans/infrastructure/persistence/plan-menu.repository';
import { MenuRepository } from '../menus/infrastructure/persistence/menu.repository';
import { User } from './domain/user';
import bcrypt from 'bcryptjs';
import { AuthProvidersEnum } from '../auth/auth-providers.enum';
import { FilesService } from '../files/files.service';
import { StatusEnum } from '../statuses/statuses.enum';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { FileType } from '../files/domain/file';
import { Role } from '../roles/domain/role';
import { Status } from '../statuses/domain/status';
import { UpdateUserDto } from './dto/update-user.dto';
import { Menu } from '../menus/domain/menu';
import { RoleEntity } from '../roles/infrastructure/persistence/relational/entities/role.entity';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UserRepository,
    private readonly filesService: FilesService,
    private readonly userMenuRepository: UserMenuRepository,
    private readonly userRoleRepository: UserRoleRepository,
    private readonly planMenuRepository: PlanMenuRepository,
    private readonly menuRepository: MenuRepository,
    @InjectRepository(RoleEntity)
    private readonly usersServiceRoleRepository: Repository<RoleEntity>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    // Do not remove comment below.
    // <creating-property />

    let password: string | undefined = undefined;

    if (createUserDto.password) {
      const salt = await bcrypt.genSalt();
      password = await bcrypt.hash(createUserDto.password, salt);
    }

    let email: string | null = null;

    if (createUserDto.email) {
      const userObject = await this.usersRepository.findByEmail(
        createUserDto.email,
      );
      // Only block when the email belongs to a LIVE user. A row that was
      // soft-deleted in the past frees the email for re-use.
      if (userObject && !userObject.deletedAt) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            email: 'emailAlreadyExists',
          },
        });
      }
      email = createUserDto.email;
    }

    let photo: FileType | null | undefined = undefined;

    if (createUserDto.photo?.id) {
      const fileObject = await this.filesService.findById(
        createUserDto.photo.id,
      );
      if (!fileObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            photo: 'imageNotExists',
          },
        });
      }
      photo = fileObject;
    } else if (createUserDto.photo === null) {
      photo = null;
    }

    let role: Role | undefined = undefined;

    if (
      createUserDto.role?.id !== undefined &&
      createUserDto.role?.id !== null
    ) {
      const roleObject = await this.usersServiceRoleRepository.findOne({
        where: { id: Number(createUserDto.role.id) },
      });
      if (!roleObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            role: 'roleNotExists',
          },
        });
      }

      role = {
        id: createUserDto.role.id,
      };
    }

    let status: Status | undefined = undefined;

    if (createUserDto.status?.id) {
      const statusObject = Object.values(StatusEnum)
        .map(String)
        .includes(String(createUserDto.status.id));
      if (!statusObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            status: 'statusNotExists',
          },
        });
      }

      status = {
        id: createUserDto.status.id,
      };
    }

    // (新) roleIds 多角色路径 — 校验全部 id 存在,然后持久化到 user_roles
    const roleIds = createUserDto.roleIds ?? [];
    const uniqueRoleIds = [...new Set(roleIds)];
    if (uniqueRoleIds.length > 0) {
      const foundRoles = await this.usersServiceRoleRepository.find({
        where: { id: In(uniqueRoleIds) },
      });
      if (foundRoles.length !== uniqueRoleIds.length) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: { roleIds: 'roleNotExists' },
        });
      }
    }

    let createdUser: User;
    try {
      createdUser = await this.usersRepository.create({
        // Do not remove comment below.
        // <creating-property-payload />
        firstName: createUserDto.firstName,
        lastName: createUserDto.lastName ?? null,
        email: email,
        password: password,
        photo: photo,
        role: role,
        status: status,
        provider: createUserDto.provider ?? AuthProvidersEnum.email,
        socialId: createUserDto.socialId,
        tier: createUserDto.tier ?? 'Lv0',
        currentPlanId: createUserDto.currentPlanId ?? null,
        pointsBalance: createUserDto.pointsBalance ?? 0,
        chatQuotaUsed: createUserDto.chatQuotaUsed ?? 0,
        chatQuotaTotal: createUserDto.chatQuotaTotal ?? 0,
        subscriptionExpiredAt: createUserDto.subscriptionExpiredAt ?? null,
        registeredAt: createUserDto.registeredAt ?? null,
        lastLoginAt: createUserDto.lastLoginAt ?? null,
      });

      // (新) 同步写入 user_roles — multi-role 身份生效
      if (uniqueRoleIds.length > 0) {
        const userId = Number(createdUser.id);
        await this.userRoleRepository.save(
          uniqueRoleIds.map((roleId) => ({ userId, roleId })) as any,
        );
      }
    } catch (err) {
      // Translate the partial-unique-index violation (live user already
      // owns this email) into the same 422 emailAlreadyExists the explicit
      // pre-check would have thrown. Without this the raw Postgres error
      // bubbles up as a 500.
      if (err instanceof Error) {
        const pgCode = (err as unknown as { code?: string }).code;
        if (
          pgCode === '23505' /* PG unique_violation */ ||
          /duplicate key/i.test(err.message)
        ) {
          throw new UnprocessableEntityException({
            status: HttpStatus.UNPROCESSABLE_ENTITY,
            errors: { email: 'emailAlreadyExists' },
          });
        }
      }
      throw err;
    }

    return createdUser;
  }

  /**
   * Whether the user holds the super admin role anywhere — legacy
   * `User.roleId` or the `user_roles` junction table.
   *
   * Public so `MenuAccessGuard` / other guards can short-circuit
   * permission checks without poking into private repository fields.
   * Returns `false` if the user does not exist.
   */
  async isSuperAdmin(userId: number): Promise<boolean> {
    const user = await this.usersRepository.findById(userId);
    if (!user) return false;
    const ids = new Set<number>();
    if (user.role?.id) ids.add(Number(user.role.id));
    const junction = await this.userRoleRepository.findByUserId(userId);
    for (const r of junction) ids.add(Number(r.roleId));
    if (ids.size === 0) return false;
    const roles = await this.usersServiceRoleRepository.find({
      where: { id: In([...ids]) },
    });
    return roles.some((r) => r.code === 'super_admin');
  }

  findManyWithPagination({
    filterOptions,
    sortOptions,
    paginationOptions,
  }: {
    filterOptions?: FilterUserDto | null;
    sortOptions?: SortUserDto[] | null;
    paginationOptions: IPaginationOptions;
  }) {
    return this.usersRepository.findManyWithPagination({
      filterOptions,
      sortOptions,
      paginationOptions,
    });
  }

  findById(id: User['id']): Promise<NullableType<User>> {
    return this.usersRepository.findById(id);
  }

  findByIds(ids: User['id'][]): Promise<User[]> {
    return this.usersRepository.findByIds(ids);
  }

  findByEmail(email: User['email']): Promise<NullableType<User>> {
    return this.usersRepository.findByEmail(email);
  }

  findBySocialIdAndProvider({
    socialId,
    provider,
  }: {
    socialId: User['socialId'];
    provider: User['provider'];
  }): Promise<NullableType<User>> {
    return this.usersRepository.findBySocialIdAndProvider({
      socialId,
      provider,
    });
  }

  async update(
    id: User['id'],
    updateUserDto: UpdateUserDto,
  ): Promise<User | null> {
    // Do not remove comment below.
    // <updating-property />

    let password: string | undefined = undefined;

    if (updateUserDto.password) {
      const userObject = await this.usersRepository.findById(id);

      if (userObject && userObject?.password !== updateUserDto.password) {
        const salt = await bcrypt.genSalt();
        password = await bcrypt.hash(updateUserDto.password, salt);
      }
    }

    let email: string | null | undefined = undefined;

    if (updateUserDto.email) {
      const userObject = await this.usersRepository.findByEmail(
        updateUserDto.email,
      );

      if (userObject && userObject.id !== id) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            email: 'emailAlreadyExists',
          },
        });
      }

      email = updateUserDto.email;
    } else if (updateUserDto.email === null) {
      email = null;
    }

    let photo: FileType | null | undefined = undefined;

    if (updateUserDto.photo?.id) {
      const fileObject = await this.filesService.findById(
        updateUserDto.photo.id,
      );
      if (!fileObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            photo: 'imageNotExists',
          },
        });
      }
      photo = fileObject;
    } else if (updateUserDto.photo === null) {
      photo = null;
    }

    let role: Role | undefined = undefined;

    if (
      updateUserDto.role?.id !== undefined &&
      updateUserDto.role?.id !== null
    ) {
      const roleObject = await this.usersServiceRoleRepository.findOne({
        where: { id: Number(updateUserDto.role.id) },
      });
      if (!roleObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            role: 'roleNotExists',
          },
        });
      }

      role = {
        id: updateUserDto.role.id,
      };
    }

    let status: Status | undefined = undefined;

    if (updateUserDto.status?.id) {
      const statusObject = Object.values(StatusEnum)
        .map(String)
        .includes(String(updateUserDto.status.id));
      if (!statusObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            status: 'statusNotExists',
          },
        });
      }

      status = {
        id: updateUserDto.status.id,
      };
    }

    // roleIds 多角色路径 — 校验全部 id 存在,空数组=清空 user_roles
    const roleIds = updateUserDto.roleIds;
    const uniqueRoleIds =
      roleIds !== undefined ? [...new Set(roleIds)] : undefined;
    if (uniqueRoleIds !== undefined && uniqueRoleIds.length > 0) {
      const foundRoles = await this.usersServiceRoleRepository.find({
        where: { id: In(uniqueRoleIds) },
      });
      if (foundRoles.length !== uniqueRoleIds.length) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: { roleIds: 'roleNotExists' },
        });
      }
    }

    const updated = await this.usersRepository.update(id, {
      // Do not remove comment below.
      // <updating-property-payload />
      firstName: updateUserDto.firstName,
      lastName: updateUserDto.lastName,
      email,
      password,
      photo,
      role,
      status,
      provider: updateUserDto.provider,
      socialId: updateUserDto.socialId,
      tier: updateUserDto.tier,
      currentPlanId: updateUserDto.currentPlanId,
      pointsBalance: updateUserDto.pointsBalance,
      chatQuotaUsed: updateUserDto.chatQuotaUsed,
      chatQuotaTotal: updateUserDto.chatQuotaTotal,
      subscriptionExpiredAt: updateUserDto.subscriptionExpiredAt,
    });

    // 同步 user_roles — 单次批量 save(避免 create-in-map 的 floating-promise 缺陷)
    if (updated && uniqueRoleIds !== undefined) {
      const userId = Number(id);
      await this.userRoleRepository.delete({ userId });
      if (uniqueRoleIds.length > 0) {
        await this.userRoleRepository.save(
          uniqueRoleIds.map((rid) => ({ userId, roleId: rid })) as any,
        );
      }
    }

    return updated;
  }

  async remove(id: User['id']): Promise<void> {
    await this.usersRepository.remove(id);
  }

  async assignExtraMenu(
    userId: number,
    menuId: string,
    expiresAt?: Date,
  ): Promise<void> {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    await this.userMenuRepository.assignMenuToUser(userId, menuId, expiresAt);
  }

  async assignExtraMenus(userId: number, menuIds: string[]): Promise<void> {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    // Delete all existing extra menus for user and insert new ones
    await this.userMenuRepository.deleteByUserId(userId);
    for (const menuId of menuIds) {
      await this.userMenuRepository.assignMenuToUser(userId, menuId);
    }
  }

  async removeExtraMenu(userId: number, menuId: string): Promise<void> {
    await this.userMenuRepository.removeMenuFromUser(userId, menuId);
  }

  async getUserExtraMenus(userId: number): Promise<Menu[]> {
    const userMenus = await this.userMenuRepository.findByUserId(userId);
    if (userMenus.length === 0) {
      return [];
    }
    const menuIds = userMenus.map((um) => um.menuId);
    return this.menuRepository.findByIds(menuIds);
  }

  async getUserAllMenus(userId: number): Promise<Menu[]> {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    console.log('[getUserAllMenus] Debug:', {
      userId,
      userRoleId: user.role?.id,
      userCurrentPlanId: user.currentPlanId,
    });

    // Super admin (roleId === 1) gets all menus
    if (user.role?.id === 1) {
      return this.menuRepository.findTree();
    }

    const allMenuIds = new Set<string>();

    // 1. Get menus from user_roles (new multi-role system)
    const userRoleIds = await this.getUserRoles(userId);
    console.log('[getUserAllMenus] userRoleIds:', userRoleIds);
    for (const roleId of userRoleIds) {
      const roleMenus = await this.menuRepository.getMenusByRoleId(roleId);
      console.log(
        '[getUserAllMenus] roleMenus from roleId',
        roleId,
        ':',
        roleMenus.map((m) => m.id),
      );
      roleMenus.forEach((m) => allMenuIds.add(m.id));
    }

    // Fallback: If user_roles table is empty, try the old roleId on user table
    if (
      userRoleIds.length === 0 &&
      user.role?.id &&
      Number(user.role.id) !== 1
    ) {
      const roleMenus = await this.menuRepository.getMenusByRoleId(
        Number(user.role.id),
      );
      console.log(
        '[getUserAllMenus] roleMenus from user.role.id',
        user.role.id,
        ':',
        roleMenus.map((m) => m.id),
      );
      roleMenus.forEach((m) => allMenuIds.add(m.id));
    }

    // 2. Get menus from plan
    if (user.currentPlanId) {
      const planMenus = await this.planMenuRepository.findByPlanId(
        user.currentPlanId,
      );
      console.log(
        '[getUserAllMenus] planMenus:',
        planMenus.map((pm) => pm.menuId),
      );
      planMenus.forEach((pm) => allMenuIds.add(pm.menuId));
    } else {
      console.log('[getUserAllMenus] No currentPlanId for user');
    }

    // 3. Get user extra menus (valid ones only - not expired)
    const userExtraMenus =
      await this.userMenuRepository.findValidByUserId(userId);
    console.log(
      '[getUserAllMenus] userExtraMenus:',
      userExtraMenus.map((um) => um.menuId),
    );
    userExtraMenus.forEach((um) => allMenuIds.add(um.menuId));

    console.log('[getUserAllMenus] allMenuIds:', [...allMenuIds]);

    if (allMenuIds.size === 0) {
      return [];
    }

    // Get all menus as flat list and build tree structure
    const allMenus = await this.menuRepository.findByIds([...allMenuIds]);
    console.log(
      '[getUserAllMenus] allMenus paths:',
      allMenus.map((m) => m.path),
    );
    return this.buildMenuTree(allMenus);
  }

  private buildMenuTree(menus: Menu[]): Menu[] {
    const menuMap = new Map<string, Menu>();
    const roots: Menu[] = [];

    menus.forEach((menu) => {
      menuMap.set(menu.id, { ...menu, children: [] });
    });

    menus.forEach((menu) => {
      const domainMenu = menuMap.get(menu.id)!;
      if (menu.parentId && menuMap.has(menu.parentId)) {
        const parent = menuMap.get(menu.parentId)!;
        parent.children!.push(domainMenu);
      } else {
        roots.push(domainMenu);
      }
    });

    return roots;
  }

  async getUserRoles(userId: number): Promise<number[]> {
    const userRoles = await this.userRoleRepository.findByUserId(userId);
    return userRoles.map((ur) => ur.roleId);
  }

  async assignRoles(userId: number, roleIds: number[]): Promise<void> {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.userRoleRepository.delete({ userId });
    if (roleIds.length > 0) {
      const userRoles = roleIds.map((roleId) =>
        this.userRoleRepository.create({ userId, roleId }),
      );
      await this.userRoleRepository.save(userRoles);
    }
  }

  async removeRole(userId: number, roleId: number): Promise<void> {
    await this.userRoleRepository.delete({ userId, roleId });
  }
}
