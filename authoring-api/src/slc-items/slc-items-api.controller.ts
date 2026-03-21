import {
  Body,
  Controller,
  Delete,
  HttpException,
  Param,
  Patch,
  Post,
  Put,
  Request,
} from '@nestjs/common';
import { SLCItemsService } from './slc-items.service';
import { ConfigService } from '@nestjs/config';
import { exists } from 'fs-extra';
import { readFile } from 'fs/promises';

@Controller('slc-items-api')
export class SLCItemsAPIController {
  constructor(
    private config: ConfigService,
    private catalog: SLCItemsService,
  ) {}

  async throwIfNotValidApiToken(req: any) {
    const apiToken = req.headers['api-token'];
    if (!apiToken) throw new HttpException(`Missing 'api-token' header!`, 401);
    const path = `${this.config.get('STORAGE_PATH')}/SLCS_CATALOG_API_TOKENS.txt`;
    if (await exists(path)) {
      const tokens = await readFile(path, 'utf-8');
      const includes = tokens
        .split('\n')
        .map((t) => t.trim())
        .includes(apiToken);
      if (includes) return;
    }
    throw new HttpException('Unauthorized! Invalid API token.', 401);
  }

  @Post()
  async create(@Request() req: any, @Body() body: any) {
    await this.throwIfNotValidApiToken(req);
    if (!req.headers['api-user-email'])
      throw new HttpException(`Missing 'api-user-email' header!`, 401);
    try {
      return await this.catalog.create(req.headers['api-user-email'], body);
    } catch (error) {
      throw new HttpException(error.message, 500);
    }
  }
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: any,
  ) {
    await this.throwIfNotValidApiToken(req);
    const existing = await this.catalog.read(id, null, true);
    if (!existing)
      throw new HttpException(`Item with id ${id} not found!`, 404);
    try {
      return await this.catalog.update(id, null, body, true);
    } catch (error) {
      throw new HttpException(error.message, 500);
    }
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Request() req: any) {
    await this.throwIfNotValidApiToken(req);
    const existing = await this.catalog.read(id, null, true);
    if (!existing)
      throw new HttpException(`Item with id ${id} not found!`, 404);
    try {
      return await this.catalog.delete(id, null, true);
    } catch (error) {
      throw new HttpException(error.message, 500);
    }
  }

  @Put(':id/sync-to-aggregate')
  async syncToAggregate(@Param('id') id: string, @Request() req: any) {
    await this.throwIfNotValidApiToken(req);
    const existing = await this.catalog.read(id, null, true);
    if (!existing)
      throw new HttpException(`Item with id ${id} not found!`, 404);
    try {
      return await this.catalog.syncToAggregate(id);
    } catch (error) {
      throw new HttpException(error.message, 500);
    }
  }
}
