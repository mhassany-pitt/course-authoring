import { Controller, Get, Param, Query } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { filter, transform } from './catalog.transform';

@Controller('catalog')
export class CatalogController {

  constructor(
    private service: CatalogService,
  ) { }

  @Get('contents')
  async getContents() {
    const contents = await this.service.getContents();
    return contents.filter(filter).map(transform);
  }

  @Get('contents/:contentId/courses')
  async getCourses(@Param('contentId') contentId: number) {
    return await this.service.getCourses(contentId);
  }

  @Get('contents/aggregate-concepts')
  async getAggregateConcepts(@Query('contentId') contentId: number) {
    return await this.service.getAggregateConcepts(contentId);
  }

  @Get('contents/um2-concepts')
  async getUM2Concepts(@Query('activityName') activityName: string) {
    return await this.service.getUM2Concepts(activityName);
  }

  @Get('contents/pcrs/code-submissions')
  async getPCRSCodeSubmissions(@Query('activityName') activityName: string) {
    return await this.service.getPCRSCodeSubmissions(activityName);
  }
}
