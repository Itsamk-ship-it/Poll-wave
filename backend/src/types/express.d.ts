import 'express';

declare global {
  namespace Express {
    interface AuthUser {
      id: string;
      role: string;
      jti: string;
    }
    interface Request {
      user?: AuthUser;
    }
  }
}

export {};
