import {
  Controller, Delete, Get, HttpException, Param, Patch,
  Post, Query, Request, UseGuards
} from '@nestjs/common';
import { AuthenticatedGuard } from 'src/auth/authenticated.guard';
import { toObject, useId } from 'src/utils';
import { CoursesService } from './courses.service';
import { UsersService } from 'src/users/users.service';

@Controller('courses')
export class CoursesController {

  constructor(
    private courses: CoursesService,
    private users: UsersService,
  ) { }

  @Get()
  @UseGuards(AuthenticatedGuard)
  async index(@Request() req: any, @Query('trash_can') trash_can: boolean) {
    return (await this.courses.list({ user_email: req.user.email, trash_can })).map(c => {
      c = useId(toObject(c));
      delete c.linkings;
      return c;
    });
  }

  @Post()
  @UseGuards(AuthenticatedGuard)
  async create(@Request() req: any) {
    const course = await this.courses.create({ user_email: req.user.email });
    return useId(toObject(course));
  }

  @Get(':id')
  @UseGuards(AuthenticatedGuard)
  async read(@Request() req: any) {
    let course = await this.courses.load({ id: req.params.id, user_email: req.user.email });
    course = useId(toObject(course));
    course.linkings = {
      course_id: course.linkings?.aggregate?.mapped_course_id,
      group_id: course.linkings?.portal_test2?.mapped_group_id,
      last_synced: course.linkings?.last_synced,
    };
    return course;
  }

  @Get(':id/export')
  async export(@Param('id') id: string) {
    const found = await this.courses.findById({ id });
    if (!found) throw new HttpException('course not found!', 404);

    const course = useId(toObject(found));

    course.instructor = {
      email: course.user_email,
      fullname: (await this.users.findUser(course.user_email)).fullname,
    };
    course.resources?.forEach((r: any) => {
      r.id = `${r.id}`;
      delete r.providers;
    });
    course.units?.forEach((u: any, index: number) => {
      u.id = `${u.id}`;
      // find parent unit
      for (let i = index - 1; i >= 0; i--)
        if (course.units[i].level == u.level - 1) {
          u.parent = course.units[i].id;
          break;
        }
    });
    course.units?.forEach((u: any) => {
      delete u.level;
      delete u._ui_expand;
    });

    delete course.students;
    delete course.user_email;
    delete course.linkings;
    delete course.collaborator_emails;
    delete course.groups;
    delete course.year;
    delete course.term;

    return course;
  }

  @Patch(':id')
  @UseGuards(AuthenticatedGuard)
  async update(@Request() req: any) {
    const course = await this.courses.update({ id: req.params.id, user_email: req.user.email }, req.body);
    return useId(toObject(course));
  }

  @Delete(':id')
  @UseGuards(AuthenticatedGuard)
  async delete(@Request() req: any, @Query('undo') undo: boolean) {
    const course = await this.courses.delete({ id: req.params.id, user_email: req.user.email }, undo);
    return useId(toObject(course));
  }
}
