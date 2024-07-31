import { Controller } from '@nestjs/common';
import { HubService } from './hub.service';
import { UsersService } from 'src/users/users.service';

@Controller('hub')
export class HubController {

  constructor(
    private service: HubService,
    private users: UsersService,
  ) { }
}
