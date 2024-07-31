import { Controller } from '@nestjs/common';
import { CoursesService } from '../courses-service/courses.service';

@Controller('courses')
export class CoursesController {

  constructor(
    private courses: CoursesService,
  ) { }
}
