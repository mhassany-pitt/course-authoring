import { Test, TestingModule } from '@nestjs/testing';
import { ApiTokensService } from './api-tokens.service';
import { getModelToken } from '@nestjs/mongoose';

describe('ApiTokensService', () => {
  let service: ApiTokensService;
  let mockTokenModel: any;

  const mockToken = {
    _id: '60c72b2f9b1d8b2bad8b4567',
    name: 'Test Token',
    token_hash: 'mockhash',
    token_prefix: 'ca_tok_1234...5678',
    active: true,
    created_by: 'admin@paws.lab',
    user_email: 'admin@paws.lab',
    roles: ['app-admin', 'author'],
    expires_at: new Date(Date.now() + 86400000), // tomorrow
    last_used_at: null,
    toObject: function () {
      return { ...this };
    },
    save: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    mockTokenModel = {
      create: jest.fn().mockImplementation((dto) =>
        Promise.resolve({
          ...dto,
          _id: '60c72b2f9b1d8b2bad8b4567',
          toObject: function () {
            return { ...this };
          },
        }),
      ),
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([mockToken]),
        }),
      }),
      findOne: jest.fn(),
      findById: jest.fn().mockResolvedValue(mockToken),
      findByIdAndDelete: jest.fn().mockResolvedValue(mockToken),
      updateOne: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({}),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiTokensService,
        {
          provide: getModelToken('api_tokens'),
          useValue: mockTokenModel,
        },
      ],
    }).compile();

    service = module.get<ApiTokensService>(ApiTokensService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should generate a token with ca_tok_ prefix and sha256 hash', async () => {
    const result = await service.create({
      name: 'Script Token',
      expires_in_days: 7,
      created_by: 'admin@test.com',
    });

    expect(result.token).toBeDefined();
    expect(result.token.startsWith('ca_tok_')).toBe(true);
    expect(result.record.name).toBe('Script Token');
    expect(result.record.token_prefix).toBeDefined();
    expect((result.record as any).token_hash).toBeUndefined();
    expect(mockTokenModel.create).toHaveBeenCalled();
  });

  it('should validate a valid active unexpired token', async () => {
    mockTokenModel.findOne.mockResolvedValue(mockToken);

    const user = await service.validateToken('mock-raw-token');
    expect(user).toBeDefined();
    expect(user.email).toBe('admin@paws.lab');
    expect(user.roles).toContain('app-admin');
    expect(user.type).toBe('api-token');
  });

  it('should reject an expired token', async () => {
    const expiredToken = {
      ...mockToken,
      expires_at: new Date(Date.now() - 100000), // in the past
    };
    mockTokenModel.findOne.mockResolvedValue(expiredToken);

    const user = await service.validateToken('mock-raw-token');
    expect(user).toBeNull();
  });

  it('should reject an unknown token', async () => {
    mockTokenModel.findOne.mockResolvedValue(null);

    const user = await service.validateToken('invalid-token');
    expect(user).toBeNull();
  });

  it('should revoke a token', async () => {
    const result = await service.revoke('60c72b2f9b1d8b2bad8b4567');
    expect(result.success).toBe(true);
    expect(mockTokenModel.findByIdAndDelete).toHaveBeenCalledWith('60c72b2f9b1d8b2bad8b4567');
  });
});

