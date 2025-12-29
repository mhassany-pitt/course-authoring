import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  Res,
} from '@nestjs/common';
import { HubService } from './hub.service';
import { Response } from 'express';
import { toObject, useId } from 'src/utils';
import { UsersService } from 'src/users/users.service';

@Controller('hub')
export class HubController {
  constructor(
    private service: HubService,
    private users: UsersService,
  ) {}

  private async usersMapping() {
    return (await this.users.listInfo()).reduce((map, { email, fullname }) => {
      map[email] = { fullname, email };
      return map;
    }, {});
  }

  @Get()
  async index() {
    const users = await this.usersMapping();
    return (await this.service.list())
      .map(useId)
      .map(({ units, resources, ...course }) => ({
        ...course,
        author: users[course.user_email],
        units_ct: units.length,
        resources_ct: resources.length,
      }))
      .sort((a, b) => b.id.localeCompare(a.id));
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    let course = await this.service.get(id);
    if (!course || !course.published) throw new NotFoundException();
    course = useId(toObject(course));
    delete course.linkings;
    delete course.groups;
    delete course.collaborator_emails;
    const { email, fullname } = await this.users.findUser(course.user_email);
    return { ...course, author: { fullname, email } };
  }
}
