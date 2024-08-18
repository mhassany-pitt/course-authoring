import { Test, TestingModule } from '@nestjs/testing';
import { MasteryGridService } from './mastery-grid.service';

describe('MasteryGridService', () => {
  let service: MasteryGridService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MasteryGridService],
    }).compile();

    service = module.get<MasteryGridService>(MasteryGridService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
