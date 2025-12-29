import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CatalogItemDocument = HydratedDocument<CatalogItem>;
export type CatalogItemReportDocument = HydratedDocument<CatalogItemReport>;

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class CatalogItem {
  @Prop({ required: true }) user_email: string;
  @Prop({ default: 'private', enum: ['public', 'private', 'deprecated'] })
  status: string;
  @Prop({ default: () => new Date() }) listed_at: Date;
  @Prop({ type: Date }) updated_at: Date;
  @Prop({ type: [String], default: [] }) tags: string[];

  @Prop({ type: Object, default: {} })
  identity: {
    id?: string;
    title?: string;
    type?: string;
  };

  @Prop({ type: Object, default: {} })
  links: {
    demo_url?: string;
  };

  @Prop({ type: Object, default: {} })
  attribution: {
    authors?: { name?: string; affiliation?: string }[];
    publisher?: string;
    provider?: string;
    created_at?: Date;
  };

  @Prop({ type: Object, default: {} })
  languages: {
    content_language?: string;
    programming_languages?: string[];
  };

  @Prop({ type: Object, default: {} })
  content: {
    prompt?: string;
    source_code?: string;
  };

  @Prop({ type: Object, default: {} })
  classification: {
    topics?: string[];
    difficulty?: string;
    knowledge_components?: Record<
      string,
      {
        note?: string;
        concepts?: string[];
        created_at?: Date;
        updated_at?: Date;
      }
    >;
  };

  @Prop({ type: Object, default: {} })
  pedagogy: {
    learning_objectives?: string[];
    instructional_role?: string;
    prerequisites?: {
      topics?: string[];
      concepts?: string[];
      item_ids?: string[];
    };
  };

  @Prop({ type: Object, default: {} })
  interaction: {
    interaction_type?: string;
  };

  @Prop({ type: Array, default: [] })
  delivery: {
    format?: string;
    url?: string;
  }[];

  @Prop({ type: Object, default: {} })
  rights: {
    license?: string;
    license_url?: string;
    usage_notes?: string;
  };

  @Prop({ type: Array, default: [] })
  uses: {
    context_id?: string;
    context_name?: string;
    used_at?: Date;
    used_by?: string;
  }[];
}

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class CatalogItemReport {
  @Prop({ required: true }) item_id: string;
  @Prop() reason: string;
  @Prop() details: string;
  @Prop({ default: false }) resolved: boolean;
  @Prop({ type: Date }) resolved_at: Date;
}

export const CatalogItemSchema = SchemaFactory.createForClass(CatalogItem);
export const CatalogItemReportSchema =
  SchemaFactory.createForClass(CatalogItemReport);
