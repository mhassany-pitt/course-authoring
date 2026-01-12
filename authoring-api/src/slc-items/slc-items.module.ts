import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SLCItemsController } from './slc-items.controller';
import { SLCItemsService } from './slc-items.service';
import {
  CatalogItemReportSchema,
  CatalogItemSchema,
} from 'src/catalog_v2/catalog-item.schema';
import { SLCItemsAPIController } from './slc-items-api.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'catalog_items_v2', schema: CatalogItemSchema },
      { name: 'catalog_item_reports_v2', schema: CatalogItemReportSchema },
    ]),
  ],
  controllers: [SLCItemsController, SLCItemsAPIController],
  providers: [SLCItemsService],
  exports: [SLCItemsService],
})
export class SLCItemsModule { }
