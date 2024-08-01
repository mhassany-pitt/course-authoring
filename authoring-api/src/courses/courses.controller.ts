import {
  Controller, Delete, Get, Patch,
  Post, Query, Request, UseGuards
} from '@nestjs/common';
import { AuthenticatedGuard } from 'src/auth/authenticated.guard';
import { toObject, useId } from 'src/utils';
import { CoursesService } from './courses.service';

@Controller('courses')
export class CoursesController {

  constructor(
    private courses: CoursesService,
  ) { }

  @Get()
  @UseGuards(AuthenticatedGuard)
  async index(@Query('trash_can') trash_can: boolean) {
    return (await this.courses.list({ trash_can })).map(c => useId(toObject(c)));
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
    const course = await this.courses.load(req.params.id);
    return useId(toObject(course));
  }

  @Patch(':id')
  @UseGuards(AuthenticatedGuard)
  async update(@Request() req: any) {
    const course = await this.courses.update(req.params.id, req.body);
    return useId(toObject(course));
  }

  @Delete(':id')
  @UseGuards(AuthenticatedGuard)
  async delete(@Request() req: any, @Query('undo') undo: boolean) {
    const course = await this.courses.delete(req.params.id, undo);
    return useId(toObject(course));
  }
}
