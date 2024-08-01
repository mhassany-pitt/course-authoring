import { Module } from '@nestjs/common';
import { HubController } from './hub.controller';
import { HubService } from './hub.service';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [
    UsersModule,
  ],
  controllers: [HubController],
  providers: [HubService]
})
export class HubModule { }
