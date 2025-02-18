import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LocalStrategy } from './local.strategy';
import { SessionSerializer } from './session.serializer';
import { AESService } from './aes.service';

@Module({
  imports: [
    UsersModule,
    PassportModule.register({ session: true }),
  ],
  providers: [
    AuthService, LocalStrategy, 
    SessionSerializer, AESService],
  controllers: [AuthController],
})
export class AuthModule { }
