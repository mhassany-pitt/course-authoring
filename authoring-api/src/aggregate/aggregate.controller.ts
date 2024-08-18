import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AggregateService } from './aggregate.service';
import { AuthenticatedGuard } from 'src/auth/authenticated.guard';

@Controller('aggregate')
export class AggregateController {

    constructor(
        private service: AggregateService,
    ) { }

    @Get('domains')
    @UseGuards(AuthenticatedGuard)
    getDomains() {
        return this.service.domains();
    }

    @Get('authors')
    @UseGuards(AuthenticatedGuard)
    getAuthors() {
        return this.service.authors();
    }

    @Get('providers')
    @UseGuards(AuthenticatedGuard)
    getProviders(@Query('domain_id') domainId: string) {
        return this.service.providers(domainId);
    }

    @Get('activites')
    @UseGuards(AuthenticatedGuard)
    getActivites(@Query('domain_id') domainId: string, @Query('provider_id') providerId: string) {
        return this.service.activites(domainId, providerId);
    }
}
