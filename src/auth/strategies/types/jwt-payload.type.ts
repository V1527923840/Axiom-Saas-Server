import { Session } from '../../../session/domain/session';
import { User } from '../../../users/domain/user';

export type JwtPayloadType = Pick<User, 'id' | 'role'> & {
  sessionId: Session['id'];
  roleIds?: number[]; // Additional role IDs from user_roles table
  iat: number;
  exp: number;
};
