import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { filter, transform } from './catalog.transform';
import { ConfigService } from '@nestjs/config';
import { createWriteStream, ensureDir } from 'fs-extra';

@Controller('catalog')
export class CatalogController {

  constructor(
    private config: ConfigService,
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

  @Post('contents/report')
  async reportContent(@Body() body: any) {
    const logdir = `${this.config.get('STORAGE_PATH')}/catalog-reports/`;
    await ensureDir(logdir);

    // rotate log file daily
    const logfile = (new Date()).toISOString().split('T')[0] + '.log';

    const stream = createWriteStream(`${logdir}${logfile}`, { flags: 'a' });
    stream.write(`${Date.now()} - ${JSON.stringify(body)}\n`);
    stream.end();

    return {};
  }
}
