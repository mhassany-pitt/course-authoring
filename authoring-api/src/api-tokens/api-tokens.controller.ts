import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Body,
  Req,
  UseGuards,
  HttpException,
} from '@nestjs/common';
import { ApiTokensService } from './api-tokens.service';
import { AuthenticatedGuard } from '../auth/authenticated.guard';

@Controller(['admin/api-tokens', 'user-admin/api-tokens'])
@UseGuards(AuthenticatedGuard)
export class ApiTokensController {
  constructor(private readonly apiTokensService: ApiTokensService) {}

  private checkAdmin(req: any) {
    const roles = req.user?.roles || [];
    const isAppAdmin = roles.includes('app-admin') || req.user?.email === 'moh70@pitt.edu';
    if (!isAppAdmin) {
      throw new HttpException(
        'Unauthorized! Only app-admins can manage API tokens.',
        403,
      );
    }
  }

  @Get()
  async list(@Req() req: any) {
    this.checkAdmin(req);
    return await this.apiTokensService.list();
  }

  @Post()
  async create(
    @Req() req: any,
    @Body()
    body: {
      name: string;
      expires_in_days?: number;
      expires_at?: string;
      user_email?: string;
      roles?: string[];
    },
  ) {
    this.checkAdmin(req);
    return await this.apiTokensService.create({
      ...body,
      created_by: req.user?.email || 'admin@ca.paws.lab',
      user_email: body.user_email || req.user?.email,
      roles: body.roles && body.roles.length ? body.roles : ['app-admin', 'author'],
    });
  }

  @Delete(':id')
  async revoke(@Req() req: any, @Param('id') id: string) {
    this.checkAdmin(req);
    return await this.apiTokensService.revoke(id);
  }

  @Patch(':id/toggle')
  async toggle(
    @Req() req: any,
    @Param('id') id: string,
    @Body('active') active?: boolean,
  ) {
    this.checkAdmin(req);
    return await this.apiTokensService.toggle(id, active);
  }
}

