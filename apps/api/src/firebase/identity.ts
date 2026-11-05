import type { Auth } from 'firebase-admin/auth';
import type { IdentityProvider } from '../application/ports.js';
import { DomainError, type Actor } from '../domain/model.js';
export class FirebaseIdentity implements IdentityProvider {
  constructor(private auth: Auth) {}
  async authenticate(token: string): Promise<Actor> {
    try {
      const decoded = await this.auth.verifyIdToken(token,true);
      const provider = decoded.firebase?.sign_in_provider;
      if (provider === 'anonymous') return { id:decoded.uid,role:'guest' };
      if (provider !== 'password') throw new Error('Unsupported sign-in provider');
      return {id:decoded.uid,role:'musician',musicianId:decoded.uid,emailVerified:decoded.email_verified===true};
    } catch { throw new DomainError('UNAUTHORIZED','Tu sesión venció. Volvé a ingresar.',401); }
  }
}
