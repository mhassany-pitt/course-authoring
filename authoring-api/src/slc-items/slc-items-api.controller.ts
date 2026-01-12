import {
  Body,
  Controller,
  Get,
  Header,
  Headers,
  HttpException,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { SLCItemsService } from './slc-items.service';
import { AuthenticatedGuard } from 'src/auth/authenticated.guard';
import { ConfigService } from '@nestjs/config';
import { exists, read } from 'fs-extra';
import { readFile } from 'fs/promises';

@Controller('slc-items-api')
export class SLCItemsAPIController {
  constructor(
    private config: ConfigService,
    private catalog: SLCItemsService,
  ) { }

  async throwIfNotValidApiToken(req: any) {
    const apiToken = req.headers['api-token'];
    if (!apiToken) throw new HttpException(`Missing 'api-token' header!`, 401);
    const path = `${this.config.get('STORAGE_PATH')}/SLCS_CATALOG_API_TOKENS.txt`;
    if (await exists(path)) {
      const tokens = await readFile(path, 'utf-8');
      const includes = tokens.split('\n').map((t) => t.trim()).includes(apiToken);
      if (includes) return;
    }
    throw new HttpException('Unauthorized! Invalid API token.', 401);
  }

  @Get()
  async create(
    @Request() req: any,
    @Body() body: any,
  ) {
    await this.throwIfNotValidApiToken(req);
    if (!req.headers['api-user-email'])
      throw new HttpException(`Missing 'api-user-email' header!`, 401);
    return await this.catalog.create(req.headers['api-user-email'], body);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: any,
  ) {
    await this.throwIfNotValidApiToken(req);
    return await this.catalog.update(id, null, body, true);
  }
}
