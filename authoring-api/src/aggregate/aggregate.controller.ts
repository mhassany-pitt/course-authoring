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
    async getProviders(@Query('domain_id') domainId: string) {
        const providers = await this.service.providers(domainId);
        // -- disable splice for now --
        // providers.push({ id: 'catalog.splice', name: 'SPLICE Catalog', domain: domainId });
        return providers;
    }

    @Get('activities')
    @UseGuards(AuthenticatedGuard)
    getActivities(@Query('domain_id') domainId: string, @Query('provider_id') providerId: string) {
        if (providerId == 'catalog.splice') {
            // -- disable splice for now --
            // return this.service.loadSpliceCatalogActivities(domainId);
            return [];
        } else {
            return this.service.activities(domainId, providerId);
        }
    }
}