import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ApiTokenSchema } from './api-token.schema';
import { ApiTokensService } from './api-tokens.service';
import { ApiTokensController } from './api-tokens.controller';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'api_tokens', schema: ApiTokenSchema },
    ]),
  ],
  controllers: [ApiTokensController],
  providers: [ApiTokensService],
  exports: [ApiTokensService],
})
export class ApiTokensModule {}

