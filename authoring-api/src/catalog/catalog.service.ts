import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class CatalogService {

  constructor(
    @InjectDataSource('aggregate') private aggregate: DataSource,
    @InjectDataSource('um2') private um2: DataSource,
  ) { }

  async getContents() {
    const query = `
      SELECT
        ec.content_id AS id,
        ec.content_type AS type,
        ec.content_name AS short_name,
        ec.display_name AS name,
        ec.desc AS description,
        eca.description AS problem_statement,
        eca.code AS code,
        eca.iframe_url AS iframe_url,
        eca.metadata AS metadata,
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
      LEFT JOIN ent_content_attrs eca ON eca.content_id = ec.content_id 
      WHERE ec.visible = true AND ec.privacy = 'public'
      ORDER BY ec.creation_date DESC
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

  async getAggregateConcepts(contentId: number) {
    const query = `
      SELECT kcc.id, kcc.component_name AS name, kcc.source_method AS source
      FROM ent_content ec 
      JOIN kc_content_component kcc ON kcc.content_name = ec.content_name 
      WHERE ec.content_id  = ?
      ORDER BY kcc.source_method DESC
    `;
    const concepts = await this.aggregate.query(query, [contentId]);
    return concepts;
  }

  async getUM2Concepts(activityName: string) {
    const query = `
      SELECT
        ea.ActivityID, ea.Activity AS ActivityName, ea.Description AS ActivityDescription, 
        ecc.ConceptID, ecc.Title AS ConceptTitle, ecc.Description AS ConceptDescription, 
        rca.Weight AS ConceptWeight, rca.Direction AS ConceptDirection, 
        IF(rcc.ParentConceptID IS NULL, NULL, JSON_OBJECT('i', rcc.ParentConceptID, 't', ecp.Title, 'd', ecp.Description)) AS ParentConcept,
        (
          SELECT CONCAT('[',GROUP_CONCAT(JSON_OBJECT('i', ec.ConceptID, 't', ec.Title, 'd', ec.Description)),']')
          FROM rel_concept_concept rcc 
          JOIN ent_concept ec ON ec.ConceptID = rcc.ChildConceptID 
          WHERE rcc.ParentConceptID = ecc.ConceptID
        ) AS ChildConcepts
      FROM (
        SELECT ea.*
        FROM ent_activity ea
        WHERE ea.Activity = ?
        UNION
        SELECT eac.*
        FROM ent_activity ea
        JOIN rel_activity_activity raa ON raa.ParentActivityID = ea.ActivityID
        JOIN ent_activity eac ON eac.ActivityID = raa.ChildActivityID
        WHERE ea.Activity = ?
      ) ea
      JOIN rel_concept_activity rca ON rca.ActivityID = ea.ActivityID
      JOIN ent_concept ecc ON ecc.ConceptID = rca.ConceptID 
      LEFT JOIN rel_concept_concept rcc ON rcc.ChildConceptID = rca.ConceptID
      LEFT JOIN ent_concept ecp ON ecp.ConceptID = rcc.ParentConceptID
      ORDER BY ea.ActivityID, ecp.Title, ecc.Title
    `;
    const concepts = await this.um2.query(query, [activityName, activityName]);
    // due to GROUP_CONCAT character limitations, i used shorter key names
    // now is the time to replace them with more descriptive ones
    concepts.filter((c: any) => c.ChildConcepts).forEach((c: any) => {
      c.ChildConcepts = JSON.parse(c.ChildConcepts);
      c.ChildConcepts.forEach((cc: any) => {
        cc.ConceptID = cc.i;
        cc.ConceptTitle = cc.t;
        cc.ConceptDescription = cc.d;
        delete cc.i;
        delete cc.t;
        delete cc.d;
      });
    });
    return concepts;
  }
}