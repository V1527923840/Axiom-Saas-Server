import { SetMetadata } from '@nestjs/common';

export const MenuPaths = (...paths: string[]) =>
  SetMetadata('menuPaths', paths);
