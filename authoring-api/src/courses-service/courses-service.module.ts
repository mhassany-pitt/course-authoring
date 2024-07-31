import { Module } from '@nestjs/common';
import { CoursesService } from './courses.service';
import { MongooseModule } from '@nestjs/mongoose';
import { CourseSchema } from './course.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'courses', schema: CourseSchema }
    ])
  ],
  providers: [CoursesService],
  exports: [CoursesService]
})
export class CoursesServiceModule { }
