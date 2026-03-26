import { Module } from '@nestjs/common';
import { CoursesController } from './courses.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { CourseSchema } from './course.schema';
import { CoursesService } from './courses.service';
import { UsersModule } from 'src/users/users.module';
import { CatalogV2Module } from 'src/catalog_v2/catalog_v2.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'courses', schema: CourseSchema }
    ]),
    UsersModule,
    CatalogV2Module,
  ],
  controllers: [CoursesController],
  providers: [CoursesService],
  exports: [CoursesService]
})
export class CoursesModule { }
