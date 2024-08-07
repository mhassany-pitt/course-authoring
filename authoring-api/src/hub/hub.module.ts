import { Module } from '@nestjs/common';
import { HubController } from './hub.controller';
import { HubService } from './hub.service';
import { UsersModule } from 'src/users/users.module';
import { CoursesModule } from 'src/courses/courses.module';

@Module({
  imports: [
    UsersModule, CoursesModule,
  ],
  controllers: [HubController],
  providers: [HubService]
})
export class HubModule { }
