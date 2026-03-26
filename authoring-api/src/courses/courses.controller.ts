import {
  Body, Controller, Delete, Get, HttpException, Param, Patch,
  Post, Query, Request, UseGuards
} from '@nestjs/common';
import { AuthenticatedGuard } from 'src/auth/authenticated.guard';
import { toObject, useId } from 'src/utils';
import { CoursesService } from './courses.service';
import { UsersService } from 'src/users/users.service';
import { ConfigService } from '@nestjs/config';
import { CatalogV2Service } from 'src/catalog_v2/catalog_v2.service';

@Controller('courses')
export class CoursesController {

  constructor(
    private config: ConfigService,
    private courses: CoursesService,
    private catalogV2: CatalogV2Service,
    private users: UsersService,
  ) { }

  @Get()
  @UseGuards(AuthenticatedGuard)
  async index(@Request() req: any, @Query('trash_can') trash_can: boolean) {
    return (await this.courses.list({ user_email: req.user.email, trash_can })).map(c => {
      c = useId(toObject(c));
      delete c.linkings;
      return c;
    }).sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
  }

  @Post()
  @UseGuards(AuthenticatedGuard)
  async create(@Request() req: any) {
    const course = await this.courses.create({ user_email: req.user.email });
    return useId(toObject(course));
  }

  @Post('custom')
  @UseGuards(AuthenticatedGuard)
  async createCustom(@Request() req: any, @Body() course: any) {
    if (req.user.email != 'moh70@pitt.edu')
      throw new HttpException('not allowed!', 403);
    return useId(toObject(await this.courses.createCustom(course)));
  }

  @Get('modulearn')
  async modulearn(@Request() req: any) {
    return {
      URL: this.config.get('MODULEARN_URL'),
      CREATE_COURSE_URL: this.config.get('MODULEARN_CREATE_COURSE_URL'),
    };
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
  @UseGuards(AuthenticatedGuard)
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

    for (let index = 0; index < (course.units || []).length; index++) {
      const unit = course.units[index];
      unit.id = `${unit.id}`;

      // find parent unit
      for (let parentIndex = index - 1; parentIndex >= 0; parentIndex--)
        if (course.units[parentIndex].level == unit.level - 1) {
          unit.parent = course.units[parentIndex].id;
          break;
        }

      // attach delivery info to activities
      const resources: any[] = Object.values(unit.activities || {});
      for (const resource of resources)
        for (const activity of resource) {
          activity.delivery = (await this.catalogV2.findByPAWSID(activity.id))?.delivery;
        }
    };

    course.units?.forEach((u: any) => {
      delete u.level;
      delete u._ui_expand;
    });

    // remove not-necessary/sensitive fields
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

  @Post(':id/clone')
  @UseGuards(AuthenticatedGuard)
  async clone(@Request() req: any) {
    const source = await this.courses.findById({ id: req.params.id });
    if (!source || (source.user_email != req.user.email && !source.published))
      throw new HttpException('course not found!', 404);

    const course = await this.courses.clone({ id: req.params.id, user_email: req.user.email });
    return useId(toObject(course));
  }

  @Post(':id/log')
  @UseGuards(AuthenticatedGuard)
  async log(@Request() req: any, @Param('id') id: string, @Body() log: any) {
    await this.courses.log({ id, log });
  }
}
