import { Injectable, HttpException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { InjectDataSource } from '@nestjs/typeorm/dist/common/typeorm.decorators';
import { Model } from 'mongoose';
import {
  CatalogItem,
  CatalogItemReport,
} from 'src/catalog_v2/catalog-item.schema';
import { toObject, useId } from 'src/utils';
import { DataSource } from 'typeorm/data-source/DataSource';

@Injectable()
export class SLCItemsService {
  constructor(
    @InjectModel('catalog_items_v2') private items: Model<CatalogItem>,
    @InjectModel('catalog_item_reports_v2') private reports: Model<CatalogItemReport>,
    @InjectDataSource('aggregate') private aggregate: DataSource,
  ) { }

  async list(user_email: string, isAdmin = false) {
    const items = await this.items
      .find(isAdmin ? {} : { user_email })
      .sort({ listed_at: 'desc' })
      .select(
        'identity.id identity.title identity.type status listed_at content.prompt tags attribution.authors',
      );
    return items.map((i) => useId(toObject(i)));
  }

  async create(user_email: string, payload: Partial<CatalogItem>) {
    const base = {
      status: payload?.status || 'inpublic',
      listed_at: new Date(),
      ...payload,
      user_email,
    };
    const created = await this.items.create(base);
    return useId(toObject(created));
  }

  async read(id: string, user_email: string, isAdmin = false) {
    const found = await this.items.findOne(
      isAdmin ? { _id: id } : { _id: id, user_email },
    );
    return found ? useId(toObject(found)) : null;
  }

  async update(
    id: string,
    user_email: string,
    payload: Partial<CatalogItem>,
    isAdmin = false,
  ) {
    delete (payload as any)._id; // prevent _id updates
    const updated = await this.items.findOneAndUpdate(
      isAdmin ? { _id: id } : { _id: id, user_email },
      { ...payload, updated_at: new Date() },
      { new: true },
    );
    return updated ? useId(toObject(updated)) : null;
  }

  async delete(id: string, user_email: string, isAdmin = false) {
    const deleted = await this.items.findOneAndDelete(
      isAdmin ? { _id: id } : { _id: id, user_email },
    );
    return deleted ? useId(toObject(deleted)) : null;
  }

  async syncToAggregate(id: string) {
    const item = await this.items.findById(id);
    if (item.paws_id) // already synced
      return useId(toObject(item)); 

    const result = await this.aggregate.query(
      `INSERT INTO ent_content 
      (content_id, content_name, content_type, display_name, \`desc\`, url, 
        \`domain\`, provider_id, comment, visible, creation_date, creator_id, 
        privacy, author_name) 
      VALUES (null, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item.identity.title,
        item.identity.type,
        item.identity.title,
        item.content.prompt,
        item.links.demo_url,
        item.languages?.programming_languages?.[0] ?? null,
        item.attribution?.provider ?? null,
        '',
        item.status === 'public' ? 1 : 0,
        item.created_at,
        item.user_email,
        item.status === 'public' ? 'public' : 'private',
        item.attribution?.authors?.map(a => a.name).join(', ') ?? '',
      ]
    );

    item.paws_id = result.insertId;
    await item.save();
    return useId(toObject(item));
  }

  async listReports() {
    const reports = await this.reports.find().sort({
      resolved_at: 'asc',
      created_at: 'desc',
    });
    const itemIds = [
      ...new Set(
        reports.map((report) => report.item_id).filter((itemId) => !!itemId),
      ),
    ];
    const items = itemIds.length
      ? await this.items
        .find({ _id: { $in: itemIds } })
        .select('identity.id identity.title identity.type status user_email')
      : [];
    const itemMap = new Map(
      items.map((item) => [item._id.toString(), useId(toObject(item))]),
    );

    return reports.map((report) => {
      const reportData = useId(toObject(report));
      const itemId = reportData.item_id;
      return {
        ...reportData,
        item: itemId ? itemMap.get(itemId) || null : null,
      };
    });
  }

  async updateReport(id: string, payload: Partial<CatalogItemReport>) {
    const updates: Partial<CatalogItemReport> = {};
    if (typeof payload.reason === 'string') updates.reason = payload.reason;
    if (typeof payload.details === 'string') updates.details = payload.details;
    if (typeof payload.resolved === 'boolean') {
      updates.resolved = payload.resolved;
      updates.resolved_at = payload.resolved ? new Date() : null;
    }

    const updated = await this.reports.findOneAndUpdate(
      { _id: id },
      { ...updates, updated_at: new Date() },
      { new: true },
    );
    if (!updated) throw new HttpException('catalog item report not found', 404);
    return useId(toObject(updated));
  }

  async options() {
    const [
      identityTypes,
      interactionTypes,
      instructionalRoles,
      deliveryFormats,
    ] = await Promise.all([
      this.items.distinct('identity.type'),
      this.items.distinct('interaction.interaction_type'),
      this.items.distinct('pedagogy.instructional_role'),
      this.items.distinct('delivery.format'),
    ]);

    return {
      identity_types: this.normalizeDistinct(identityTypes),
      interaction_types: this.normalizeDistinct(interactionTypes),
      instructional_roles: this.normalizeDistinct(instructionalRoles),
      delivery_formats: this.normalizeDistinct(deliveryFormats),
    };
  }

  private normalizeDistinct(values: unknown[]) {
    const seen = new Set<string>();
    const normalized: string[] = [];
    values.forEach((value) => {
      const trimmed = typeof value === 'string' ? value.trim() : '';
      if (!trimmed || seen.has(trimmed)) return;
      seen.add(trimmed);
      normalized.push(trimmed);
    });
    return normalized.sort((a, b) => a.localeCompare(b));
  }
}
