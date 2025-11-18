import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import mysql from 'mysql2/promise';
import { DataSource } from 'typeorm';
import axios from 'axios';

@Injectable()
export class AggregateService {

    constructor(
        @InjectDataSource('aggregate')
        private agg: DataSource,
    ) { }

    async getAggregate(con: mysql.Connection, contentType: string) {
        const [results, fields] = await con.query(
            `select content_id, provider_id, display_name, creator_id, url, domain, ` +
            `(select group_concat(tag separator ', ') from ent_tagging where entity_id = content_id) as tags ` +
            `from ent_content where visible = 1 and content_type = ?`,
            [contentType]
        );
        return (results as any[]).map((r: any) => ({
            id: r.content_id,
            name: r.display_name,
            author: r.creator_id,
            url: r.url,
            domain: r.domain,
            tags: r.tags?.split(',').map((t: string) => t.trim()) || [],
        }));
    }

    async domains() {
        return await this.agg.query(
            'select name as id, `desc` as name from ent_domain'
        );
    }

    async authors() {
        return await this.agg.query(
            'select creator_id as id, creator_name as name from ent_creator'
        );
    }

    async providers(domainId: string) {
        return await this.agg.query(
            'select p.provider_id as id, p.name, pd.domain_name as domain ' +
            'from ent_provider p, rel_provider_domain pd ' +
            'where p.provider_id = pd.provider_id and pd.domain_name = ?',
            [domainId]
        );
    }

    async activities(domainId: string, providerId: string) {
        return await this.agg.query(
            'select content_id as id, provider_id, display_name as name, creator_id as author_id, url, domain, ' +
            '(select group_concat(tag separator \',\') as tags from ent_tagging where entity_id = ent_content.content_id) as tags ' +
            'from ent_content ' +
            'where visible = 1 and domain = ? and provider_id = ? ' +
            'order by display_name desc',
            [domainId, providerId]
        );
    }

    async loadSpliceCatalogActivities(domainId: string) {
        const res = await axios.get('https://splice.cs.vt.edu/api/items?programming_language=' + domainId);
        const getProtocolUrls = (item: any) => item.protocol.reduce((urls: any, protocol: any, index: number) => {
            urls[protocol] = item.protocol_url[index];
            return urls;
        }, {});
        return res.data.results.map((item: any) => ({
            id: `catalog.splice.${item.id}`,
            provider_id: 'catalog.splice',
            name: item.title,
            author_id: null,
            author: item.author,
            url: item.iframe_url,
            domain: domainId,
            tags: item.keywords,
            protocols: getProtocolUrls(item),
        }));
    }
}
