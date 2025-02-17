import {
  Body, Controller, Get, HttpException,
  Patch, Post, Req, Request, Response, UseGuards
} from '@nestjs/common';
import { AuthenticatedGuard } from './authenticated.guard';
import { LocalAuthGuard } from './local-auth.guard';
import { UsersService } from 'src/users/users.service';
import { compare, hash } from 'bcryptjs';
import { AESService } from './aes.service';

@Controller('auth')
export class AuthController {

  constructor(
    private aes: AESService,
    private users: UsersService,
  ) { }

  @Get('handshake')
  handshake(@Req() req: any) {
    return { user: req.user };
  }

  @Post('register')
  async register(@Body() body: any) {
    let { email, password, fullname } = body;
    email = email.toLowerCase();
    const user = await this.users.findUser(email);
    if (user) throw new HttpException({ message: 'An account with this email address already exists. Please use your credentials to login.' }, 422);
    await this.users.create({ fullname, email, password: await hash(password, 10), roles: ['author'] });
    return {};
  }

  @Post('login')
  @UseGuards(LocalAuthGuard)
  login(@Req() req: any) {
    return req.user;
  }

  /*
  --> call from backend (not in the browser) 
  - validate if the email and password is correct or create new user if doesn't exists
  x-login-token = 
    POST /x-login-token
      :email
      :password
  return aes-encrypted({ email, expires_at })
  - if user exists but password is incorrect, 
    return error
  */

  @Post('x-login-token')
  async getXLoginToken(@Body() body: any) {
    const { fullname, email, password } = body;
    let user = await this.users.findUser(email);

    if (!user) { // create new user if not exists
      await this.users.create({
        active: true, fullname, email,
        password: await hash(password, 10),
        roles: ['author', 'x-author']
      });
      user = await this.users.findUser(email);
    }

    if (await compare(password, user.password)) {
      const expires_at = new Date();
      expires_at.setSeconds(expires_at.getSeconds() + 10);
      const result = { email, expires_at: expires_at.getTime() };
      return this.aes.encrypt(JSON.stringify(result));
    } else {
      throw new HttpException({
        message: 'Invalid email or password.'
      }, 422);
    }
  }

  /*
  --> call in the browser
  do the actual login
  POST /x-login
    :x-login-token
  */

  @Post('x-login')
  async xLogin(@Request() req: any, @Response() resp: any, @Body() body: any) {
    let token = null;
    try { token = this.aes.decrypt(body.token); }
    catch (exp) {
      throw new HttpException({ message: 'Invalid token.' }, 422);
    }

    const decrypted = JSON.parse(token);
    if (parseInt(decrypted.expires_at) < Date.now()) {
      throw new HttpException({ message: 'Token expired.' }, 422);
    }

    const user = await this.users.findUser(decrypted.email);
    if (!user) throw new HttpException({
      message: 'Invalid email or password.'
    }, 422);

    req.login(user, (err: any) => {
      if (err) {
        resp.status(422, { message: 'Login failed!' });
      } else {
        const { email, fullname, roles } = user;
        resp.status(200).send({ email, fullname, roles });
      }
    });
  }

  @Patch('update-password')
  async updatePassword(@Req() req: any, @Body() body: any) {
    const { current_password, new_password, token } = body;
    const isLoggedIn = req.user;
    if (isLoggedIn) {
      const user = await this.users.findUser(req.user.email);
      if (user && await compare(current_password, user.password))
        await this.users.updatePassword({ email: user.email, password: new_password });
      else throw new HttpException({ message: 'Current password did not match.' }, 422);
    } else {
      const user = await this.users.findUserByResetPassToken({ token });
      if (user) await this.users.updatePassword({ email: user.email, password: new_password });
      else throw new HttpException({ message: 'Update token is invalid or expired.' }, 422);
    }
    return {};
  }

  @Post('logout')
  @UseGuards(AuthenticatedGuard)
  logout(@Req() req: any) {
    req.session.destroy();
    return {};
  }
}
