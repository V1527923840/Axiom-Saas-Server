import { SetMetadata } from '@nestjs/common';

/**
 * Marks a route handler as public — bypasses JWT auth.
 *
 * Marker-only: pair with an auth guard that consults
 * `Reflector.get('isPublic', ...)`. The class-level `AuthGuard('jwt')`
 * on AiAgentController currently ignores this metadata, so a route marked
 * with `@Public()` is still protected by the class-level guard. We add
 * the metadata so that when a global Reflector-based guard is introduced
 * (T3 or later), the route opt-in is already in place.
 */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
