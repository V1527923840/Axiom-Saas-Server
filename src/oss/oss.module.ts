import { Module } from '@nestjs/common';
import { OssController } from './oss.controller';
import { OssService } from './oss.service';
import { MenusModule } from '../menus/menus.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [MenusModule, UsersModule],
  controllers: [OssController],
  providers: [OssService],
  exports: [OssService],
})
export class OssModule {}
