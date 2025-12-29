import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CatalogV2Service } from './catalog_v2.service';

@Controller('catalog-v2')
export class CatalogV2Controller {
  constructor(private catalog: CatalogV2Service) {}

  @Get()
  async list() {
    return await this.catalog.list();
  }

  @Get(':id')
  async read(@Param('id') id: string) {
    return await this.catalog.read(id);
  }

  @Post(':id/report')
  async report(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Body('details') details: string,
  ) {
    return await this.catalog.report(id, reason, details);
  }
}
