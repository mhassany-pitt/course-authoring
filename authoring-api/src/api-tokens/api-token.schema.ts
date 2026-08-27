import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ApiTokenDocument = HydratedDocument<ApiToken>;

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class ApiToken {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true, index: true })
  token_hash: string;

  @Prop({ required: true })
  token_prefix: string;

  @Prop({ default: true })
  active: boolean;

  @Prop({ required: true })
  created_by: string;

  @Prop({ type: String, default: null })
  user_email: string;

  @Prop({ type: [String], default: ['app-admin', 'author'] })
  roles: string[];

  @Prop({ required: true })
  expires_at: Date;

  @Prop({ type: Date, default: null })
  last_used_at: Date;

  created_at?: Date;
  updated_at?: Date;
}

export const ApiTokenSchema = SchemaFactory.createForClass(ApiToken);

