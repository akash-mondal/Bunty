import { JWTPayload } from './auth.types';

declare module 'express-serve-static-core' {
  interface Request {
    user?: JWTPayload;
  }
}
