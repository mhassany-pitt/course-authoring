import { Injectable } from '@nestjs/common';
import { compare } from 'bcryptjs';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {

  constructor(private users: UsersService) { }

  async validateUser(email: string, password: string) {
    if (email && password) {
      email = email.toLowerCase();
      const user = await this.users.findUser(email);
      if (user && user.active && await compare(password, user.password)) {
        const { email, fullname, type, roles } = user;
        return { email, fullname, type, roles };
      }
    }
    return null;
  }

  async validateApiUser(apiKey: string) {
    if (!apiKey) return false;
    const [email, password] = apiKey.split(':');
    return (await this.validateUser(email, password))?.type === 'api';
  }
}