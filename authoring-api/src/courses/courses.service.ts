import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Course } from './course.schema';
import { toObject, useId } from 'src/utils';
import { exists, readJson, write, writeFile } from 'fs-extra';

@Injectable()
export class CoursesService {

  constructor(
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

  private async migrate() {
    // if (await exists('./courses-to-migrate.done')) {
    //   console.log('courses already migrated!');
    //   return;
    // }
    // const courses = await readJson('./courses-to-migrate.json');
    // for (const course of courses) {
    //   await this.courses.create(course);
    //   console.log('migrated course:', course['name']);
    // }
    // await writeFile('./courses-to-migrate.done', '');
  }

  getProviderSupportedProtocols(only: string[]) {
    const mapping = {
      "animatedexamples": "splice,lti,pitt",
      "codecheck": "splice,lti",
      "codelab": "lti",
      "codeocean": "lti",
      "codeworkout": "lti",
      "ctat": "lti",
      "dbqa": "lti",
      "educvideos": "pitt",
      "mchq": "pitt",
      "opendsa_problems": "lti",
      "opendsa_slideshows": "lti",
      "parsons": "splice,lti,pitt",
      "pcex": "splice,lti,pitt",
      "pcex_activity": "splice,lti,pitt",
      "pcex_ch": "splice,lti,pitt",
      "pcrs": "pitt",
      "quizjet": "pitt",
      "quizpet": "pitt",
      "readingmirror": "pitt",
      "salt": "pitt",
      "sqlknot": "pitt",
      "sqltutor": "pitt",
      "webex": "pitt",
    };

    return only.reduce((acc, curr) => {
      acc[curr] = mapping[curr].split(",");
      return acc;
    }, {});
  }
}
