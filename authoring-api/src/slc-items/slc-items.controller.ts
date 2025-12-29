import {
  Body,
  Controller,
  Get,
  HttpException,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { SLCItemsService } from './slc-items.service';
import { AuthenticatedGuard } from 'src/auth/authenticated.guard';

@Controller('slc-items')
export class SLCItemsController {
  constructor(private catalog: SLCItemsService) {}

  private isAppAdmin(req: any) {
    return !!req.user?.roles?.includes('app-admin');
  }

  @Get('reports')
  @UseGuards(AuthenticatedGuard)
  async reports(@Request() req: any) {
    if (!this.isAppAdmin(req)) throw new HttpException('not allowed!', 403);
    return await this.catalog.listReports();
  }

  @Patch('reports/:id')
  @UseGuards(AuthenticatedGuard)
  async updateReport(
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: any,
  ) {
    if (!this.isAppAdmin(req)) throw new HttpException('not allowed!', 403);
    return await this.catalog.updateReport(id, body);
  }

  @Get('options')
  @UseGuards(AuthenticatedGuard)
  async options() {
    return await this.catalog.options();
  }

  @Get()
  @UseGuards(AuthenticatedGuard)
  async index(@Request() req: any) {
    return await this.catalog.list(req.user.email, this.isAppAdmin(req));
  }

  @Post()
  @UseGuards(AuthenticatedGuard)
  async create(@Request() req: any, @Body() body: any) {
    return await this.catalog.create(req.user.email, body);
  }

  @Get(':id')
  @UseGuards(AuthenticatedGuard)
  async read(@Param('id') id: string, @Request() req: any) {
    return await this.catalog.read(id, req.user.email, this.isAppAdmin(req));
  }

  @Patch(':id')
  @UseGuards(AuthenticatedGuard)
  async update(
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: any,
  ) {
    return await this.catalog.update(
      id,
      req.user.email,
      body,
      this.isAppAdmin(req),
    );
  }
}
