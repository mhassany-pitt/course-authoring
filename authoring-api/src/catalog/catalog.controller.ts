import { Controller, Get, Param } from '@nestjs/common';
import { CatalogService } from './catalog.service';

@Controller('catalog')
export class CatalogController {

  private TYPES_MAPPING: any = {
    'animatedexamples': 'animated_example',
  };

  private AUTHOR_NAMES_MAPPING: any = {
    "admin": "Administrator",
    "Akhuseyinoglu": "Kamil Akhuseyinoglu",
    "akhuseyinoglu": "Kamil Akhuseyinoglu",
    "akhuseyinoglu&Thea Wang": " Kamil Akhuseyinoglu & Thea Wang",
    "akhuseyinoglu&theawang": " Kamil Akhuseyinoglu & Thea Wang",
    "Arun Balajiee": "Arun Balajiee Lekshmi Narayanan",
    "arunb": "Arun Balajiee Lekshmi Narayanan",
    "arunb & rully": "Arun Balajiee Lekshmi Narayanan & Rully Hendrawan",
    "cayhorstmann": "Cay Horstmann",
    "jab464": "Jordan Barria-Pineda",
    "Jordan Ariel Barria Pineda": "Jordan Barria-Pineda",
    "Jordan Barria": "Jordan Barria-Pineda",
    "Natalya": "Natalya Goreva",
    "odg4": "Oliver Gladys",
    "rully": "Rully Hendrawan",
    "rah225": "Rully Hendrawan",
  };

  constructor(
    private service: CatalogService,
  ) { }

  @Get('contents')
  async getContents() {
    const contents = await this.service.getContents();
    contents.forEach((content: any) => {
      if (content.type && content.type in this.TYPES_MAPPING)
        content.type = this.TYPES_MAPPING[content.type];
      if (content.author_name && content.author_name in this.AUTHOR_NAMES_MAPPING)
        content.author_name = this.AUTHOR_NAMES_MAPPING[content.author_name];
    });
    return contents;
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
