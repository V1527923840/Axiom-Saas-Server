import { Module, forwardRef } from '@nestjs/common';
import { VersionController } from './versions.controller';
import { VersionService } from './version.service';
import { ScrapeLogModule } from '../scrape-log/scrape-log.module';
import { OssModule } from '../oss/oss.module';
import { MenusModule } from '../menus/menus.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    forwardRef(() => ScrapeLogModule),
    OssModule,
    forwardRef(() => MenusModule),
    forwardRef(() => UsersModule),
  ],
  controllers: [VersionController],
  providers: [VersionService],
  exports: [VersionService],
})
export class VersionsModule {}
