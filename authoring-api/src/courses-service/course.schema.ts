import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CourseDocument = HydratedDocument<Course>;

@Schema()
export class Course {
  @Prop() created_by: string;
  @Prop() title: string;
}

export const CourseSchema = SchemaFactory.createForClass(Course);