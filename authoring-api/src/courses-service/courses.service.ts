import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Course } from './course.schema';
import { toObject } from 'src/utils';
import { ensureDirSync, writeFile } from 'fs-extra';

@Injectable()
export class CoursesService {

  constructor(
    private config: ConfigService,
    @InjectModel('courses') private courses: Model<Course>,
  ) { }
}
