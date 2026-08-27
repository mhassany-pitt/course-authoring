import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Course } from 'src/courses/course.schema';
import { getLegacyCid } from 'src/courses/legacy-courses';
import { toObject } from 'src/utils';

@Injectable()
export class HubService {
  constructor(
    private config: ConfigService,
    @InjectModel('courses') private courses: Model<Course>,
  ) {}

  async list() {
    const list = (
      await this.courses
        .find({ published: true })
        .select(
          'id cid code name description domain institution units resources user_email created_at',
        )
    ).map(toObject);

    return list.map((c) => ({
      ...c,
      cid: c.cid || getLegacyCid(c.code, c.name),
    }));
  }

  async get(id: string) {
    const course = await this.courses.findOne({ _id: id });
    if (!course) return null;
    if (!course.cid) {
      course.cid = getLegacyCid(course.code, course.name);
    }
    return course;
  }
}
