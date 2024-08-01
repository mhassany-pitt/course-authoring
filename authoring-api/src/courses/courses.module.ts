import { Module } from '@nestjs/common';
import { CoursesController } from './courses.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { CourseSchema } from './course.schema';
import { CoursesService } from './courses.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'courses', schema: CourseSchema }
    ])
  ],
  controllers: [CoursesController],
  providers: [CoursesService],
})
export class CoursesModule { }
