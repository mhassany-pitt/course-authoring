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
import { AuthService } from 'src/auth/auth.service';

@Controller('courses')
export class CoursesController {

  constructor(
    private config: ConfigService,
    private courses: CoursesService,
    private catalogV2: CatalogV2Service,
    private users: UsersService,
    private auth: AuthService,
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

  private isAppAdmin(req: any): boolean {
    const roles = req.user?.roles || [];
    return roles.includes('app-admin') || req.user?.email === 'moh70@pitt.edu';
  }

  @Post('custom')
  @UseGuards(AuthenticatedGuard)
  async createCustom(@Request() req: any, @Body() course: any) {
    if (!this.isAppAdmin(req))
      throw new HttpException('not allowed!', 403);
    const result = await this.courses.createCustom(course);
    if (Array.isArray(result)) {
      return result.map(c => useId(toObject(c)));
    }
    return useId(toObject(result));
  }

  @Get('admin/all')
  @UseGuards(AuthenticatedGuard)
  async listAdmin(@Request() req: any, @Query('trash_can') trash_can: boolean) {
    if (!this.isAppAdmin(req))
      throw new HttpException('not allowed!', 403);
    const trash = String(trash_can) === 'true';
    return (await this.courses.listAdmin(trash)).map(c => {
      c = useId(toObject(c));
      return c;
    }).sort((a, b) => (new Date(b.created_at || 0)).getTime() - (new Date(a.created_at || 0)).getTime());
  }

  @Get('admin/:id')
  @UseGuards(AuthenticatedGuard)
  async getAdmin(@Request() req: any, @Param('id') id: string) {
    if (!this.isAppAdmin(req))
      throw new HttpException('not allowed!', 403);
    const course = await this.courses.findByIdAdmin(id);
    if (!course) throw new HttpException('course not found!', 404);
    return useId(toObject(course));
  }

  @Patch('admin/:id')
  @UseGuards(AuthenticatedGuard)
  async updateAdmin(@Request() req: any, @Param('id') id: string, @Body() course: any) {
    if (!this.isAppAdmin(req))
      throw new HttpException('not allowed!', 403);
    const updated = await this.courses.updateAdmin(id, course);
    if (!updated) throw new HttpException('course not found!', 404);
    return useId(toObject(updated));
  }

  @Delete('admin/:id')
  @UseGuards(AuthenticatedGuard)
  async deleteAdmin(@Request() req: any, @Param('id') id: string, @Query('undo') undo: boolean) {
    if (!this.isAppAdmin(req))
      throw new HttpException('not allowed!', 403);
    const isUndo = String(undo) === 'true';
    const deleted = await this.courses.deleteAdmin(id, isUndo);
    if (!deleted) throw new HttpException('course not found!', 404);
    return useId(toObject(deleted));
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
  async read(@Request() req: any, @Param('id') id: string) {
    const isAdmin = this.isAppAdmin(req);
    const course = isAdmin
      ? await this.courses.findById({ id })
      : await this.courses.load({ id, user_email: req.user.email });
    if (!course) throw new HttpException('course not found!', 404);
    return this._read(id);
  }

  @Get(':id/x-api-user')
  async readXApiUser(@Request() req: any, @Param('id') id: string) {
    if (!(await this.auth.validateApiUser(req.headers['x-api-key']))) 
      throw new HttpException('Invalid API credentials', 401);
    const course = await this.courses.findById({ id });
    if (!course) throw new HttpException('course not found!', 404);
    return this._read(id);
  }

  private async _read(id: string) {
    const course = useId(toObject(await this.courses.findById({ id })));
    course.linkings = {
      course_id: course.linkings?.aggregate?.mapped_course_id,
      group_id: course.linkings?.portal_test2?.mapped_group_id,
      last_synced: course.linkings?.last_synced,
    };
    return course;
  }

  @Get(':id/export')
  @UseGuards(AuthenticatedGuard)
  async export(@Request() req: any, @Param('id') id: string) {
    const isAdmin = this.isAppAdmin(req);
    const course = isAdmin
      ? useId(toObject(await this.courses.findById({ id })))
      : useId(toObject(await this.courses.load({ user_email: req.user.email, id })));
    if (!course) throw new HttpException('course not found!', 404);
    return this._export(id);
  }

  @Get(':id/export/x-api-user') // modulearn can get the course structure
  async exportXApiUser(@Request() req: any, @Param('id') id: string) {
    if (!(await this.auth.validateApiUser(req.headers['x-api-key']))) 
      throw new HttpException('Invalid API credentials', 401);
    const course = useId(toObject(await this.courses.findById({ id })));
    if (!course) throw new HttpException('course not found!', 404);
    return this._export(id);
  }

  private async _export(id: string) {
    const course = useId(toObject(await this.courses.findById({ id })));
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
  async update(@Request() req: any, @Param('id') id: string) {
    const isAdmin = this.isAppAdmin(req);
    const course = isAdmin
      ? await this.courses.findById({ id })
      : await this.courses.load({ user_email: req.user.email, id });
    if (!course) throw new HttpException('course not found!', 404);
    return this._update(id, isAdmin ? course.user_email : req.user.email, req.body);
  }

  @Patch(':id/x-api-user') // modulearn can update course structure
  async updateXApiUser(@Request() req: any, @Param('id') id: string) {
    if (!(await this.auth.validateApiUser(req.headers['x-api-key']))) 
      throw new HttpException('Invalid API credentials', 401);
    const course = useId(toObject(await this.courses.findById({ id })));
    if (!course) throw new HttpException('course not found!', 404);
    return this._update(id, course.user_email, req.body);
  }

  private async _update(id: string, user_email: string, body: any) {
    const course = useId(toObject(
      await this.courses.update({ id, user_email }, body)
    ));
    course.linkings = {
      course_id: course.linkings?.aggregate?.mapped_course_id,
      group_id: course.linkings?.portal_test2?.mapped_group_id,
      last_synced: course.linkings?.last_synced,
    };
    return course;
  }

  @Delete(':id')
  @UseGuards(AuthenticatedGuard)
  async delete(@Request() req: any, @Param('id') id: string, @Query('undo') undo: boolean) {
    const isAdmin = this.isAppAdmin(req);
    if (isAdmin) {
      const isUndo = String(undo) === 'true';
      const deleted = await this.courses.deleteAdmin(id, isUndo);
      if (!deleted) throw new HttpException('course not found!', 404);
      return useId(toObject(deleted));
    }
    const course = await this.courses.delete({ id, user_email: req.user.email }, undo);
    if (!course) throw new HttpException('course not found!', 404);
    return useId(toObject(course));
  }

  @Post(':id/clone')
  @UseGuards(AuthenticatedGuard)
  async clone(@Request() req: any, @Param('id') id: string) {
    const isAdmin = this.isAppAdmin(req);
    const source = await this.courses.findById({ id });
    if (!source || (!isAdmin && source.user_email != req.user.email && !source.published))
      throw new HttpException('course not found!', 404);

    const course = await this.courses.clone({ id, user_email: req.user.email });
    return useId(toObject(course));
  }

  @Post(':id/log')
  @UseGuards(AuthenticatedGuard)
  async log(@Request() req: any, @Param('id') id: string, @Body() log: any) {
    await this.courses.log({ id, log });
  }
}
