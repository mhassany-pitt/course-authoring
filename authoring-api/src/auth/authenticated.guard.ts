import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTokensService } from '../api-tokens/api-tokens.service';

@Injectable()
export class AuthenticatedGuard implements CanActivate {
  constructor(private readonly apiTokensService: ApiTokensService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // 1. Check session authentication via cookie/passport
    if (typeof request.isAuthenticated === 'function' && request.isAuthenticated()) {
      return true;
    }

    // 2. Check token authentication via Authorization header or x-api-key
    const authHeader = request.headers['authorization'] || request.headers['Authorization'];
    let token = '';

    if (authHeader && typeof authHeader === 'string') {
      const parts = authHeader.split(' ');
      if (parts.length === 2 && (parts[0].toLowerCase() === 'bearer' || parts[0].toLowerCase() === 'token')) {
        token = parts[1];
      } else {
        token = authHeader.trim();
      }
    } else if (request.headers['x-api-key']) {
      token = (request.headers['x-api-key'] as string).trim();
    }

    if (token) {
      const apiUser = await this.apiTokensService.validateToken(token);
      if (apiUser) {
        request.user = apiUser;
        request.isAuthenticated = () => true;
        return true;
      }
      throw new UnauthorizedException('Invalid or expired API token');
    }

    return false;
  }
}
