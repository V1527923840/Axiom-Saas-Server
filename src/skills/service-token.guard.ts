import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AllConfigType } from '../config/config.type';

@Injectable()
export class ServiceTokenGuard implements CanActivate {
  constructor(private readonly configService: ConfigService<AllConfigType>) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const auth = req.headers['authorization'] || '';
    const expected = `Bearer ${this.configService.get('skill.serviceToken', { infer: true })}`;
    if (auth !== expected) {
      throw new UnauthorizedException('invalid service token');
    }
    req.callerContext = {
      userId: req.headers['x-user-id'] as string,
      sessionId: req.headers['x-session-id'] as string,
      attemptId: req.headers['x-attempt-id'] as string,
    };
    return true;
  }
}
