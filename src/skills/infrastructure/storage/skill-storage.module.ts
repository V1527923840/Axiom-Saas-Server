import { Module } from '@nestjs/common';
import { SkillStorageService } from './skill-storage.service';

@Module({
  providers: [SkillStorageService],
  exports: [SkillStorageService],
})
export class SkillStorageModule {}
