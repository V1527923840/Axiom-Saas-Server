import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { AnonymousStrategy } from './strategies/anonymous.strategy';
import { MailModule } from '../mail/mail.module';
import { SessionModule } from '../session/session.module';
import { UsersModule } from '../users/users.module';
import { JwtAuthModule } from './jwt-auth.module';

@Module({
  imports: [
    UsersModule,
    SessionModule,
    PassportModule,
    MailModule,
    JwtModule.register({}),
    JwtAuthModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, AnonymousStrategy],
  exports: [AuthService],
})
export class AuthModule {}
