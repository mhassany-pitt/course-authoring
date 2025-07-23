import { Controller, Get, Param } from '@nestjs/common';
import { CatalogService } from './catalog.service';

@Controller('catalog')
export class CatalogController {

  constructor(
    private service: CatalogService,
  ) { }

  @Get('contents')
  async getContents() {
    return await this.service.getContents();
  }

  @Get('contents/:contentId/courses')
  async getCourses(@Param('contentId') contentId: number) {
    return await this.service.getCourses(contentId);
  }

  @Get('contents/:contentId/concepts')
  async getConcepts(@Param('contentId') contentId: number) {
    return await this.service.getConcepts(contentId);
  }
}
