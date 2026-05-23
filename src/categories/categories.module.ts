import { Module, forwardRef } from '@nestjs/common';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { CategoryRelationalPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';
import { MenusModule } from '../menus/menus.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    CategoryRelationalPersistenceModule,
    forwardRef(() => MenusModule),
    forwardRef(() => UsersModule),
  ],
  controllers: [CategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService, CategoryRelationalPersistenceModule],
})
export class CategoriesModule {}
