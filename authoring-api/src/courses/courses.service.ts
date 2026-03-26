import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { writeFile } from 'fs/promises';
import { Model } from 'mongoose';
import { Course } from './course.schema';
import { toObject } from 'src/utils';
import { ensureDir } from 'fs-extra';

@Injectable()
export class CoursesService {
  constructor(
    private config: ConfigService,
    @InjectModel('courses') private courses: Model<Course>,
  ) {
    // setTimeout(() => this.migrate(), 3000);
  }

  async list({ user_email, trash_can }) {
    const filter = { $or: [{ user_email }, { collaborator_emails: user_email }], deleted_at: trash_can ? { $ne: null } : null }
    return await this.courses.find(filter);
  }

  async create({ user_email }) {
    return await this.courses.create({ user_email, created_at: new Date() });
  }

  async createCustom(course: any) {
    return await this.courses.create({ ...course, created_at: new Date() });
  }

  async clone({ id, user_email }) {
    const { _id, ...course } = toObject(await this.courses.findOne({ _id: id }));

    delete course.created_at;
    delete course.updated_at;
    delete course.deleted_at;
    delete course.user_email;
    delete course.linkings;
    delete course.collaborator_emails;
    delete course.groups;

    course.published = false;
    course.name = `${course.name} (clone)`;

    return await this.courses.create({ ...course, user_email, created_at: new Date() });
  }

  async load({ user_email, id }) {
    return await this.courses.findOne({ $or: [{ user_email }, { collaborator_emails: user_email }], _id: id });
  }

  async findById({ id }) {
    return await this.courses.findOne({ _id: id });
  }

  async update({ user_email, id }, course: any, alsoUpdateLinkings = false) {
    const { linkings, ...rest } = course;
    const update = { ...rest, updated_at: new Date() };
    if (alsoUpdateLinkings) update.linkings = linkings;
    return await this.courses.findOneAndUpdate({ $or: [{ user_email }, { collaborator_emails: user_email }], _id: id }, update, { new: true });
  }

  async delete({ user_email, id }, undo: boolean) {
    return await this.courses.findOneAndUpdate({ user_email, _id: id }, { deleted_at: undo ? null : new Date() }, { new: true });
  }

  async log({ id, log }) {
    await ensureDir(`${this.config.get('STORAGE_PATH')}/logs`);
    await writeFile(
      `${this.config.get('STORAGE_PATH')}/logs/${id}.log`,
      `${Date.now()} - ${JSON.stringify(log)}\n`,
      { flag: 'a' }
    );
  }

  // private async migrate() {
  //   if (await exists('./courses-to-migrate.done')) {
  //     console.log('courses already migrated!');
  //     return;
  //   }
  //   const courses = await readJson('./courses-to-migrate.json');
  //   for (const course of courses) {
  //     await this.courses.create(course);
  //     console.log('migrated course:', course['name']);
  //   }
  //   await writeFile('./courses-to-migrate.done', '');
  // }
}
