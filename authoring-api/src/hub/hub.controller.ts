import {
  Controller, Get, NotFoundException,
  Param, Query, Res
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
  ) { }

  @Get()
  async index(@Query('key') key: string) {
    const users = (await this.users.listInfo())
      .reduce((map, { email, fullname }) => {
        map[email] = { fullname, email };
        return map;
      }, {});

    return (await this.service.list({ key })).map(course => {
      const { id, code, name, description, domain,
        institution, units, resources, user_email,
        created_at } = useId(course);
      return {
        id, code, name, author: users[user_email], description, domain, institution,
        units_ct: units.length, resources_ct: resources.length, created_at,
      };
    }).sort((a, b) => b.id.localeCompare(a.id));
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    let course = await this.service.get(id);
    if (!course || !course.published)
      throw new NotFoundException();
    course = useId(toObject(course));
    delete course.linkings;
    delete course.groups;
    delete course.collaborator_emails;
    const { email, fullname } = await this.users.findUser(course.user_email);
    return { ...course, author: { fullname, email } };
  }
}
