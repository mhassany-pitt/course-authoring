import { Module } from '@nestjs/common';
import { MasteryGridController } from './mastery-grid.controller';
import { MasteryGridService } from './mastery-grid.service';
import { CoursesModule } from 'src/courses/courses.module';

@Module({
  imports: [CoursesModule],
  controllers: [MasteryGridController],
  providers: [MasteryGridService]
})
export class MasteryGridModule { }
