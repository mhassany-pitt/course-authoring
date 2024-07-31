import { Module } from '@nestjs/common';
import { HubController } from './hub.controller';
import { HubService } from './hub.service';
import { UsersModule } from 'src/users/users.module';
import { CoursesServiceModule } from 'src/courses-service/courses-service.module';

@Module({
  imports: [
    UsersModule,
    CoursesServiceModule,
  ],
  controllers: [HubController],
  providers: [HubService]
})
export class HubModule { }
