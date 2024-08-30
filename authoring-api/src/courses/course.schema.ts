import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CourseDocument = HydratedDocument<Course>;

@Schema()
export class Course {
  @Prop() created_at: Date;
  @Prop() updated_at: Date;
  @Prop() deleted_at: Date;
  @Prop() user_email: string;

  @Prop() published: boolean;
  @Prop() code: string;
  @Prop() name: string;
  @Prop() description: string;
  @Prop() domain: string;
  @Prop() term: string;
  @Prop() year: number;
  @Prop() institution: string;
  @Prop() resources: Resource[];
  @Prop() units: Unit[];
  @Prop() tags: string[];

  @Prop() students: string;

  @Prop({ type: Object }) linkings: any;
}

export const CourseSchema = SchemaFactory.createForClass(Course);

export interface Resource {
  id: number;
  name: string;
  providers: any[];
}

export interface Unit {
  id: number;
  level: number;
  published: boolean;
  name: string;
  description: string;
  activities: { [key: number]: any[] };
}
