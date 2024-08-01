import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ProviderDocument = HydratedDocument<Provider>;

@Schema()
export class Provider {
  @Prop() created_at: Date;
  @Prop() updated_at: Date;
  @Prop() deleted_at: Date;

  @Prop() code: string;
  @Prop() name: string;
  @Prop() description: string;
  @Prop() domain: string;
  @Prop() author: string;
  @Prop() tags: string[];
  @Prop() index_url: string;
  @Prop() verified_at: Date;
}

export const ProviderSchema = SchemaFactory.createForClass(Provider);

