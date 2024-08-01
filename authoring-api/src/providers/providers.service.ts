import { Model } from 'mongoose';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Provider } from './provider.schema';
import { readdir } from 'fs/promises';

@Injectable()
export class ProvidersService {

  constructor(
    @InjectModel('providers') private providers: Model<Provider>,
  ) {
    // this.loadProviders();
  }

  // async loadProviders() {
  //   const list = await readdir('./public/providers');
  //   for (const file of list) {
  //     const name = file.replace('.json', '');
  //     this.providers.create({
  //       code: name,
  //       name: name.toUpperCase(),
  //       description: '',
  //       domain: 'unknown',
  //       author: 'unknown',
  //       tags: [],
  //       index_url: 'http://adapt2.sis.pitt.edu/next.course-authoring/providers/' + file,
  //       created_at: new Date(),
  //     })
  //   }
  // }

  async list() {
    return await this.providers.find();
  }

  async create() {
    return await this.providers.create({ created_at: new Date() });
  }

  async load(id: string) {
    return await this.providers.findById(id);
  }

  async update(id: string, course: any) {
    return await this.providers.findByIdAndUpdate(id, { ...course, updated_at: new Date() }, { new: true });
  }

  async delete(id: string, undo: boolean) {
    return await this.providers.findByIdAndUpdate(id, { deleted_at: undo ? null : new Date() }, { new: true });
  }
}
