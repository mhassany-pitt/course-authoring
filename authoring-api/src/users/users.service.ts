import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './user.schema';
import { toObject } from 'src/utils';
import { hash } from 'bcryptjs';
import { exists, readJson, writeFile } from 'fs-extra';

@Injectable()
export class UsersService {

  constructor(
    @InjectModel('users') private users: Model<User>
  ) {
    this.addInitialUsers();
    // setTimeout(() => this.migrate(), 3000);
  }

  private async addInitialUsers() {
    const list = await this.list();
    if (list.length === 0) {
      await this.create({
        active: true,
        fullname: 'Admin',
        email: 'admin@tmp.com',
        password: await hash('admin@tmp.com', 10),
        roles: ['app-admin', 'author'],
      });
    }
  }

  async list() {
    return (await this.users.find()).map(toObject);
  }

  async listInfo() {
    return (await this.users.find()).map(toObject).map(({ _id, fullname, email }) => ({ _id, fullname, email }));
  }

  async create(model: any) {
    return await this.users.create(model);
  }

  async update(email, model: any) {
    return await this.users.updateOne({ email }, model);
  }

  async remove(emails: string[]): Promise<any> {
    return await this.users.deleteMany({ email: { $in: emails } });
  }

  async findUser(email: string) {
    return toObject(await this.users.findOne({ email }));
  }

  async findAPIUser(apiKey: string) {
    return toObject(await this.users.findOne({ apiKey, userType: 'api' }));
  }

  async getUsers({ userIds }) {
    return (await this.users.find({ _id: { $in: userIds } })).map(toObject);
  }

  async findUserByResetPassToken({ token }) {
    const user = await this.users.findOne({ 'reset_pass_token.token': token });
    return user && user.reset_pass_token?.expires > Date.now()
      ? toObject(user)
      : null;
  }

  async updatePassword({ email, password }) {
    return await this.users.updateOne({ email }, { password: await hash(password, 10), reset_pass_token: null });
  }

  private async migrate() {
    // if (await exists('./authors-to-migrate.done')) {
    //   console.log('users already migrated!');
    //   return;
    // }
    // const users = await readJson('./authors-to-migrate.json');
    // for (const email of Object.keys(users)) {
    //   if (await this.users.findOne({ email })) {
    //     console.log('skipped user:', email);
    //     continue;
    //   }
    //   await this.users.create({
    //     fullname: users[email].name,
    //     email, password: Math.random().toString(36).substring(2),
    //     roles: ["author"],
    //   });
    //   console.log('migrated user:', email);
    // }
    // await writeFile('./authors-to-migrate.done', '');
  }
}