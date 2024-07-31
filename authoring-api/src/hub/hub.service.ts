import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class HubService {

  constructor(
    private config: ConfigService,
  ) { }
}