import { Controller, Get, Param, Request } from '@nestjs/common';
import { HubService } from './hub.service';
import { UsersService } from 'src/users/users.service';
import { toObject, useId } from 'src/utils';

@Controller('hub')
export class HubController {

  constructor(
    private hub: HubService,
  ) { }

  @Get()
  async index() {
    return (await this.hub.list()).map(c => useId(toObject(c))).map(c => ({
      id: c.id,
      institution: c.institution,
      domain: c.domain,
      name: c.name,
      description: c.description,
      created_at: c.created_at,
    }));
  }

  @Get(':id')
  async read(@Param('id') id: string) {
    return useId(toObject(await this.hub.load(id)));
  }
}
