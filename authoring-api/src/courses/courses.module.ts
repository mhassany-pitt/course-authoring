import { Module } from '@nestjs/common';
import { CoursesController } from './courses.controller';
import { CoursesServiceModule } from 'src/courses-service/courses-service.module';

@Module({
  controllers: [CoursesController],
  imports: [CoursesServiceModule],
  providers: [],
  exports: []
})
export class CoursesModule { }
