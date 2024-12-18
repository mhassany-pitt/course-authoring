import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Course } from './course.schema';
import { toObject, useId } from 'src/utils';

@Injectable()
export class CoursesService {

  constructor(
    @InjectModel('courses') private courses: Model<Course>,
  ) { }

  async list({ user_email, trash_can }) {
    const filter = { $or: [{ user_email }, { collaborator_emails: user_email }], deleted_at: trash_can ? { $ne: null } : null }
    return await this.courses.find(filter);
  }

  async create({ user_email }) {
    return await this.courses.create({ user_email, created_at: new Date() });
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
}
