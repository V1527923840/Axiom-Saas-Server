import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';

/**
 * Dedicated module for JWT passport strategies.
 *
 * Extracted from `AuthModule` so that consumers (e.g. social auth modules)
 * can depend on the strategies alone without pulling in the full
 * `AuthModule` (and its `UsersModule` / `SessionModule` / `MailModule`
 * dependency graph).
 */
@Module({
  imports: [PassportModule],
  providers: [JwtStrategy, JwtRefreshStrategy],
  exports: [JwtStrategy, JwtRefreshStrategy],
})
export class JwtAuthModule {}
