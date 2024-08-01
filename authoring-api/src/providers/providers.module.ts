import { Module } from '@nestjs/common';
import { ProvidersController } from './providers.controller';
import { ProvidersService } from 'src/providers/providers.service';
import { ProviderSchema } from './provider.schema';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'providers', schema: ProviderSchema }
    ])
  ],
  controllers: [ProvidersController],
  providers: [ProvidersService],
})
export class ProvidersModule { }
