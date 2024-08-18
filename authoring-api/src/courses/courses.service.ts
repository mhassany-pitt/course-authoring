import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Course } from './course.schema';

@Injectable()
export class CoursesService {

  constructor(
    @InjectModel('courses') private courses: Model<Course>,
  ) { }

  async list({ trash_can }) {
    return await this.courses.find(trash_can ? { deleted_at: { $ne: null } } : { deleted_at: null });
  }

  async create({ user_email }) {
    return await this.courses.create({ user_email, created_at: new Date() });
  }

  async load(id: string) {
    return await this.courses.findById(id);
  }

  async update(id: string, course: any) {
    return await this.courses.findByIdAndUpdate(id, { ...course, updated_at: new Date() }, { new: true });
  }

  async delete(id: string, undo: boolean) {
    return await this.courses.findByIdAndUpdate(id, { deleted_at: undo ? null : new Date() }, { new: true });
  }
}
