import { Module } from '@nestjs/common';
import { MasteryGridController } from './mastery-grid.controller';
import { MasteryGridService } from './mastery-grid.service';
import { CoursesModule } from 'src/courses/courses.module';
import { UsersModule } from 'src/users/users.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [CoursesModule, UsersModule, AuthModule],
  controllers: [MasteryGridController],
  providers: [MasteryGridService]
})
export class MasteryGridModule { }
