import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserSchema, UserSchemaClass } from './entities/user.schema';
import { UserRepository } from '../user.repository';
import { UsersDocumentRepository } from './repositories/user.repository';
import { UserRoleRepository } from '../user-role.repository';
import { UserMenuRepository } from '../user-menu.repository';

// Stub implementation for MongoDB - user_roles and user_menu would need separate handling
class StubUserRoleRepository implements UserRoleRepository {
  create(): Promise<any> {
    throw new Error('UserRoleRepository not implemented for MongoDB');
  }
  findByUserId(): Promise<any[]> {
    return Promise.resolve([]);
  }
  findByRoleId(): Promise<any[]> {
    return Promise.resolve([]);
  }
  delete(): Promise<void> {
    return Promise.resolve();
  }
  save(): Promise<any[]> {
    return Promise.resolve([]);
  }
}

class StubUserMenuRepository implements UserMenuRepository {
  assignMenuToUser(): Promise<void> {
    return Promise.resolve();
  }
  removeMenuFromUser(): Promise<void> {
    return Promise.resolve();
  }
  findByUserId(): Promise<any[]> {
    return Promise.resolve([]);
  }
  findValidByUserId(): Promise<any[]> {
    return Promise.resolve([]);
  }
  deleteByUserId(): Promise<void> {
    return Promise.resolve();
  }
}

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserSchemaClass.name, schema: UserSchema },
    ]),
  ],
  providers: [
    {
      provide: UserRepository,
      useClass: UsersDocumentRepository,
    },
    {
      provide: UserRoleRepository,
      useClass: StubUserRoleRepository,
    },
    {
      provide: UserMenuRepository,
      useClass: StubUserMenuRepository,
    },
  ],
  exports: [UserRepository, UserRoleRepository, UserMenuRepository],
})
export class DocumentUserPersistenceModule {}
