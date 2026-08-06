import { User } from '../../users/domain/user';

export type AiSessionStatus = 'active' | 'cancelled' | 'error';

export class AiSession {
  id: string;
  user: User;
  userId: number | string;
  agentType: string;
  remoteSessionId: string | null;
  title: string | null;
  status: AiSessionStatus;
  lastActiveAt: Date;
  expiresAt: Date;
  quotaCount: number;
  quotaDate: Date | string;
  inflightStartedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
