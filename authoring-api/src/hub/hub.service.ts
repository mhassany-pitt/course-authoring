import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Course } from 'src/courses/course.schema';
import { toObject } from 'src/utils';

@Injectable()
export class HubService {

  constructor(
    private config: ConfigService,
    @InjectModel('courses') private courses: Model<Course>
  ) { }

  async list({ key }) {
    const filter = { published: true };
    if (key) filter['name'] = { $regex: key, $options: 'i' };
    return (await this.courses.find(filter)).map(toObject);
  }

  async get(id: string) {
    return await this.courses.findOne({ _id: id });
  }
}