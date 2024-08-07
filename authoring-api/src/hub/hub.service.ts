import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CoursesService } from 'src/courses/courses.service';

@Injectable()
export class HubService {

  constructor(
    private courses: CoursesService,
  ) { }

  async list() {
    const courses = await this.courses.list({ trash_can: false });
    return courses.filter(c => c.published);
  }

  async load(id: string) {
    const course = await this.courses.load(id);
    return course.published ? course : null;
  }
}