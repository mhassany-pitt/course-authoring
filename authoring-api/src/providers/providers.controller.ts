import {
  Controller, Delete, Get, Patch,
  Post, Query, Request, UseGuards
} from '@nestjs/common';
import { AuthenticatedGuard } from 'src/auth/authenticated.guard';
import { toObject, useId } from 'src/utils';
import { ProvidersService } from './providers.service';

@Controller('providers')
export class ProvidersController {

  constructor(
    private providers: ProvidersService,
  ) { }

  @Get()
  @UseGuards(AuthenticatedGuard)
  async index() {
    return (await this.providers.list()).map(c => useId(toObject(c)));
  }

  @Post()
  @UseGuards(AuthenticatedGuard)
  async create(@Request() req: any) {
    const provider = await this.providers.create();
    return useId(toObject(provider));
  }

  @Get(':id')
  @UseGuards(AuthenticatedGuard)
  async read(@Request() req: any) {
    const provider = await this.providers.load(req.params.id);
    return useId(toObject(provider));
  }

  @Patch(':id')
  @UseGuards(AuthenticatedGuard)
  async update(@Request() req: any) {
    const provider = await this.providers.update(req.params.id, req.body);
    return useId(toObject(provider));
  }

  @Delete(':id')
  @UseGuards(AuthenticatedGuard)
  async delete(@Request() req: any, @Query('undo') undo: boolean) {
    const provider = await this.providers.delete(req.params.id, undo);
    return useId(toObject(provider));
  }
}
