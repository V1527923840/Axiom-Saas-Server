import { IsObject, IsString } from 'class-validator';

export class CreateSwarmRunDto {
  @IsString()
  preset_name!: string;

  @IsObject()
  user_vars!: Record<string, string>;
}
