import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CatalogV2Controller } from './catalog_v2.controller';
import { CatalogV2Service } from './catalog_v2.service';
import {
  CatalogItemReportSchema,
  CatalogItemSchema,
} from './catalog-item.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'catalog_items_v2', schema: CatalogItemSchema },
      { name: 'catalog_item_reports_v2', schema: CatalogItemReportSchema },
    ]),
  ],
  controllers: [CatalogV2Controller],
  providers: [CatalogV2Service],
  exports: [CatalogV2Service],
})
export class CatalogV2Module {}
