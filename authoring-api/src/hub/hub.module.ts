import { Module } from '@nestjs/common';
import { HubController } from './hub.controller';
import { HubService } from './hub.service';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from 'src/users/users.module';
import { CourseSchema } from 'src/courses/course.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'courses', schema: CourseSchema }
    ]),
    UsersModule,
  ],
  controllers: [HubController],
  providers: [HubService]
})
export class HubModule { }
