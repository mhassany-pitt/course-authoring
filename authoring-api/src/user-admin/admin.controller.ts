import {
  Body, Controller, Get,
  HttpException,
  Patch, Post, Req, Res, UseGuards
} from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import * as EmailValidator from 'email-validator';
import { hash } from 'bcryptjs';
import { AuthenticatedGuard } from 'src/auth/authenticated.guard';
import sha256 from 'crypto-js/sha256';

@Controller(['user-admin', 'admin'])
export class AdminController {

  constructor(
    private service: UsersService,
    @InjectConnection() private connection: Connection,
  ) { }

  private getMyEmail(req) {
    return req.user.email;
  }

  @Get('backup')
  @UseGuards(AuthenticatedGuard)
  async exportBackup(@Req() req, @Res() res: any) {
    if (!req.user?.roles?.includes('app-admin')) {
      throw new HttpException('Unauthorized! Only app-admins can download database backups.', 403);
    }
    const collections = await this.connection.db.listCollections().toArray();
    const backupData: Record<string, any[]> = {};
    for (const col of collections) {
      const colName = col.name;
      if (colName.startsWith('system.')) continue;
      backupData[colName] = await this.connection.db
        .collection(colName)
        .find()
        .toArray();
    }
    const payload = {
      exported_at: new Date().toISOString(),
      database: this.connection.db.databaseName,
      collections: backupData,
    };
    const jsonString = JSON.stringify(payload, null, 2);
    const dateStr = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="course_authoring_db_backup_${dateStr}.json"`,
    );
    res.send(jsonString);
  }

  @Get()
  @UseGuards(AuthenticatedGuard)
  async list(@Req() req) {
    const myEmail = this.getMyEmail(req);
    return (await this.service.list()).map((user: any) => {
      const { active, fullname, email, type, tags, roles } = user;
      const resp: any = { active, fullname, email, type, tags, roles };
      if (email == myEmail)
        resp.itIsMe = true;
      return resp;
    });
  }

  @Post()
  @UseGuards(AuthenticatedGuard)
  async create(@Req() req, @Body() { roles, emails, tags }: any) {
    const all = (await this.service.list()).map((user: any) => user.email.toLowerCase());
    const accounts = emails.split(',').map(text => {
      let [fullname, email, type] = text.split(':');
      fullname = fullname?.trim();
      email = email?.toLowerCase()?.trim();
      type = type?.trim();
      if (!email || !EmailValidator.validate(email))
        return null;
      return { fullname, email, type };
    }).filter((user: any) => user && !all.includes(user.email));

    for (const { fullname, email, type } of accounts) {
      const password = await hash(Math.random().toString(), 10);
      const reset_pass_token = {
        token: sha256(Math.random().toString(36).substring(2)).toString(),
        expires: Date.now() + 60 * 60 * 1000,
      };
      await this.service.create({ 
        fullname, email, password, type, 
        tags, roles, reset_pass_token 
      });
    }

    return {};
  }

  @Patch()
  @UseGuards(AuthenticatedGuard)
  async update(@Req() req, @Body() { action, data }: any) {
    const myEmail = this.getMyEmail(req);
    if (action == 'update') for (const user of data) {
      const { fullname, email, roles, active } = user;
      if (email == myEmail)
        continue;
      await this.service.update(email, { fullname, roles, active });
    } else if (action == 'delete') {
      await this.service.remove(data.filter(email => email != myEmail));
    } else if (action == 'update-fullname') for (const user of data) {
      const { fullname, email } = user;
      await this.service.update(email, { fullname });
    }
    return {};
  }

  @Post('update-password-tokens')
  @UseGuards(AuthenticatedGuard)
  async genUpdatePassTokens(@Req() req, @Body() emails: any) {
    const tokens = [];
    for (const email of emails) {
      const reset_pass_token = {
        token: sha256(Math.random().toString(36).substring(2)).toString(),
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      };

      if ((await this.service.update(email, { reset_pass_token })).modifiedCount > 0)
        tokens.push({ email, ...reset_pass_token });
    }
    return tokens;
  }
}

export { AdminController as UserAdminController };
