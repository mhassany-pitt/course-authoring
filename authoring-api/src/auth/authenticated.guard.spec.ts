import { AuthenticatedGuard } from './authenticated.guard';
import { UnauthorizedException, ExecutionContext } from '@nestjs/common';

describe('AuthenticatedGuard', () => {
  let guard: AuthenticatedGuard;
  let mockApiTokensService: any;

  beforeEach(() => {
    mockApiTokensService = {
      validateToken: jest.fn(),
    };
    guard = new AuthenticatedGuard(mockApiTokensService);
  });

  const createMockContext = (req: any): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => req,
      }),
    } as any);

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should allow request with valid session cookie', async () => {
    const req = {
      isAuthenticated: () => true,
      headers: {},
    };
    const result = await guard.canActivate(createMockContext(req));
    expect(result).toBe(true);
    expect(mockApiTokensService.validateToken).not.toHaveBeenCalled();
  });

  it('should allow request with valid Bearer token', async () => {
    const mockUser = {
      email: 'admin@paws.lab',
      fullname: 'Admin Token',
      roles: ['app-admin', 'author'],
      type: 'api-token',
    };
    mockApiTokensService.validateToken.mockResolvedValue(mockUser);

    const req: any = {
      isAuthenticated: () => false,
      headers: {
        authorization: 'Bearer ca_tok_test123',
      },
    };
    const result = await guard.canActivate(createMockContext(req));
    expect(result).toBe(true);
    expect(req.user).toEqual(mockUser);
    expect(req.isAuthenticated()).toBe(true);
    expect(mockApiTokensService.validateToken).toHaveBeenCalledWith('ca_tok_test123');
  });

  it('should allow request with valid x-api-key header', async () => {
    const mockUser = {
      email: 'admin@paws.lab',
      fullname: 'Admin Token',
      roles: ['app-admin'],
      type: 'api-token',
    };
    mockApiTokensService.validateToken.mockResolvedValue(mockUser);

    const req: any = {
      isAuthenticated: () => false,
      headers: {
        'x-api-key': 'ca_tok_custom_key',
      },
    };
    const result = await guard.canActivate(createMockContext(req));
    expect(result).toBe(true);
    expect(req.user).toEqual(mockUser);
  });

  it('should throw UnauthorizedException for invalid token', async () => {
    mockApiTokensService.validateToken.mockResolvedValue(null);

    const req: any = {
      isAuthenticated: () => false,
      headers: {
        authorization: 'Bearer bad_token',
      },
    };
    await expect(guard.canActivate(createMockContext(req))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should return false when unauthenticated and no token provided', async () => {
    const req = {
      isAuthenticated: () => false,
      headers: {},
    };
    const result = await guard.canActivate(createMockContext(req));
    expect(result).toBe(false);
  });
});
