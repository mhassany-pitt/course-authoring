import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class CatalogService {

  constructor(
    @InjectDataSource('aggregate') private aggregate: DataSource,
  ) { }

  async getContents() {
    const query = `
      SELECT
        ec.content_id AS id,
        ec.content_type AS type,
        ec.content_name AS short_name,
        ec.display_name AS name,
        ec.desc AS description,
        ec.url AS url,
        ec.domain AS domain_id,
        dm.desc AS domain_name,
        ec.provider_id,
        ep.name AS provider_name,
        ec.creator_id AS author_id,
        ec.author_name,
        ec.creation_date
      FROM
        ent_content ec 
      LEFT JOIN ent_domain dm ON dm.name = ec.domain
      LEFT JOIN ent_provider ep ON ep.provider_id = ec.provider_id 
      WHERE ec.visible = true AND ec.privacy = 'public'
    `;
    const contents = await this.aggregate.query(query);
    return contents;
  }

  async getCourses(contentId: number) {
    const query = `
      SELECT 
        ec.course_id AS id,
        ec.course_code AS code,
        ec.course_name AS name,
        ec.desc AS description,
        ec.domain AS domain_id,
        ed.desc AS domain_name,
        ec.creator_id AS author_id,
        cr.creator_name AS author_name,
        cr.affiliation_code AS author_affiliation_code,
        cr.affiliation AS author_affiliation,
        ec.creation_date,
        et.display_name AS unit_name,
        et.desc AS unit_description
      FROM rel_topic_content rtc
      JOIN ent_topic et ON et.topic_id = rtc.topic_id 
      JOIN ent_course ec ON ec.course_id = et.course_id 
      LEFT JOIN ent_domain ed ON ed.name = ec.domain
      LEFT JOIN ent_creator cr ON cr.creator_id = ec.creator_id  
      WHERE rtc.content_id = ? AND ec.visible = true
      ORDER BY ec.course_id, et.topic_id
    `;
    const courses = await this.aggregate.query(query, [contentId]);
    return courses;
  }

  async getConcepts(contentId: number) {
    const query = `
      SELECT acc.id, acc.concept_name as name, acc.direction
      FROM agg_content_concept acc 
      WHERE acc.content_id = ?
      ORDER BY acc.direction DESC
    `;
    const concepts = await this.aggregate.query(query, [contentId]);
    return concepts;
  }
}
