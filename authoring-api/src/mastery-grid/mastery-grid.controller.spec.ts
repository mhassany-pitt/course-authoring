import { Test, TestingModule } from '@nestjs/testing';
import { MasteryGridController } from './mastery-grid.controller';

describe('MasteryGridController', () => {
  let controller: MasteryGridController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MasteryGridController],
    }).compile();

    controller = module.get<MasteryGridController>(MasteryGridController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
