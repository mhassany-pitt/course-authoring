import { Injectable, HttpException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CatalogItem, CatalogItemReport } from './catalog-item.schema';
import { toObject, useId } from 'src/utils';

@Injectable()
export class CatalogV2Service {
  constructor(
    @InjectModel('catalog_items_v2') private catalogItems: Model<CatalogItem>,
    @InjectModel('catalog_item_reports_v2')
    private catalogItemReports: Model<CatalogItemReport>,
  ) {}

  async list() {
    const items = await this.catalogItems
      .find({ status: { $in: ['public', 'deprecated', 'broken:pending-fix'] } })
      .sort({ listed_at: 'desc' })
      .select(
        'identity.id identity.title identity.type status listed_at links.demo_url ' +
          'content.prompt tags attribution.authors languages.programming_languages ' +
          'attribution.provider rights.license delivery.format classification.knowledge_components',
      );

    return items
      .map((i) => toObject(i))
      .map((i) => {
        const kc = i.classification?.knowledge_components ?? {};
        const conceptsOnly = Object.fromEntries(
          Object.entries(kc).map(([k, v]: any) => [
            k,
            { concepts: v?.concepts ?? [] },
          ]),
        );
        return useId({
          ...i,
          classification: { knowledge_components: conceptsOnly },
        });
      });
  }

  async read(id: string) {
    const item = await this.catalogItems.findOne({
      _id: id,
      status: { $in: ['public', 'deprecated', 'broken:pending-fix'] },
    });
    if (!item) throw new HttpException('catalog item not found', 404);
    return useId(toObject(item));
  }

  async report(id: string, reason: string, details: string) {
    const exists = await this.catalogItems.exists({ _id: id });
    if (!exists) throw new HttpException('catalog item not found', 404);
    await this.catalogItemReports.create({
      item_id: id,
      reason,
      details,
    });
    return { ok: true };
  }
}
