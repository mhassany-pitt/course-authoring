import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { UserAdminService } from './user-admin.service';
import { UsersModule } from 'src/users/users.module';

@Module({
  controllers: [AdminController],
  imports: [UsersModule],
  providers: [UserAdminService]
})
export class AdminModule { }
export { AdminModule as UserAdminModule };
