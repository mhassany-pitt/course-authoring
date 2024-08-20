import { Injectable } from '@nestjs/common';
import { Course } from 'src/courses/course.schema';
import { EntityManager } from 'typeorm';

export interface MasteryGrid {
    last_synced: Date;
    mapped_course_id: number;
    units: {
        [unit_id: string]: {
            mapped_unit_id: number,
            activity_ids: {
                [activity_id: string]: number
            }
        }
    };
    resources: {
        [resource_id: string]: {
            mapped_resource_id: number,
            provider_ids: string[]
        }
    };
}

@Injectable()
export class MasteryGridService {

    async deleteCourse(em: EntityManager, masterygrid: MasteryGrid) {
        if (masterygrid.mapped_course_id)
            await this._deleteCourse(em, {
                id: masterygrid.mapped_course_id
            });
    }

    async deleteCourseResources(em: EntityManager, masterygrid: MasteryGrid) {
        for (const resource of Object.values(masterygrid.resources)) {
            resource.provider_ids = resource.provider_ids || [];
            for (const provider_id of resource.provider_ids)
                await this._deleteResourceProvider(em, {
                    resource_id: resource.mapped_resource_id,
                    provider_id, // provider_id is loaded from the aggregate db
                });
            await this._deleteResource(em, { id: resource.mapped_resource_id });
        }
    }

    async deleteCourseUnits(em: EntityManager, masterygrid: MasteryGrid) {
        for (const unit of Object.values(masterygrid.units)) {
            unit.activity_ids = unit.activity_ids || {};
            for (const activity_id of Object.values(unit.activity_ids))
                await this._deleteUnitActivity(em, { id: activity_id });
            await this._deleteUnit(em, { id: unit.mapped_unit_id });
        }
    }

    async addCourse(em: EntityManager, masterygrid: MasteryGrid, course: Course) {
        const course_query = await this._addCourse(em, {
            id: masterygrid.mapped_course_id,
            code: course.code?.substring(0, 50),
            name: course.name?.substring(0, 100),
            description: course.description?.substring(0, 500),
            domain: course.domain?.substring(0, 50),
            user_email: course.user_email?.substring(0, 50),
            published: !!course.published,
            created_at: course.created_at,
        });

        if (!masterygrid.mapped_course_id)
            masterygrid.mapped_course_id = course_query.insertId;
    }

    async addCourseResources(em: EntityManager, masterygrid: MasteryGrid, course: Course) {
        let r_order = 1;
        for (const resource of (course.resources || [])) {
            if (resource.id in masterygrid.resources == false)
                masterygrid.resources[resource.id] = { mapped_resource_id: null, provider_ids: [] };

            const mapped_resource = masterygrid.resources[resource.id];
            const resource_query = await this._addResource(em, {
                id: mapped_resource.mapped_resource_id,
                course_id: masterygrid.mapped_course_id,
                name: resource.name?.substring(0, 100),
                order: r_order++,
                user_email: course.user_email?.substring(0, 50),
                created_at: course.created_at,
            });

            // -- set mapped_resource_id if not set
            if (!mapped_resource.mapped_resource_id)
                mapped_resource.mapped_resource_id = resource_query.insertId;

            // -- add resource providers
            for (const provider of (resource.providers || [])) {
                await this._addResourceProvider(em, {
                    resource_id: mapped_resource.mapped_resource_id,
                    provider_id: provider.id, // provider.id is loaded from the aggregate db
                });
                if (mapped_resource.provider_ids.includes(provider.id) == false)
                    mapped_resource.provider_ids.push(provider.id);
            }
        }

        // -- filter out mapped resources that are not in the course anymore
        const resource_ids = (course.resources || []).map(r => `${r.id}`);
        Object.keys(masterygrid.resources).forEach(resource_id => {
            if (!resource_ids.includes(resource_id))
                delete masterygrid.resources[resource_id];
        });
    }

    async addCourseUnits(em: EntityManager, masterygrid: MasteryGrid, course: Course) {
        let u_order = 1;
        const parent_mapped_unit_ids = {};
        for (const unit of (course.units || [])) {
            if (unit.id in masterygrid.units == false)
                masterygrid.units[unit.id] = { mapped_unit_id: null, activity_ids: {} };

            const mapped_unit = masterygrid.units[unit.id];
            const unit_query = await this._addUnit(em, {
                id: mapped_unit.mapped_unit_id,
                course_id: masterygrid.mapped_course_id,
                name: unit.name?.substring(0, 100),
                description: unit.description?.substring(0, 500),
                parent: unit.level == 0 ? null : parent_mapped_unit_ids[unit.level - 1],
                order: u_order++,
                user_email: course.user_email?.substring(0, 50),
                published: !!unit.published,
                created_at: course.created_at,
            });

            // -- set mapped_unit_id if not set
            if (!mapped_unit.mapped_unit_id)
                mapped_unit.mapped_unit_id = unit_query.insertId;

            parent_mapped_unit_ids[unit.level] = mapped_unit.mapped_unit_id;

            // -- add unit activities
            let a_order = 1;
            for (const resource_id of Object.keys(unit.activities || {})) {
                for (const activity of unit.activities[resource_id]) {
                    if (activity.id in mapped_unit.activity_ids == false)
                        mapped_unit.activity_ids[activity.id] = null;

                    const activity_query = await this._addUnitActivity(em, {
                        id: mapped_unit.activity_ids[activity.id],
                        unit_id: mapped_unit.mapped_unit_id,
                        resource_id: masterygrid.resources[resource_id].mapped_resource_id,
                        content_id: activity.id,
                        name: activity.name?.substring(0, 100),
                        order: a_order++,
                        user_email: course.user_email?.substring(0, 50),
                        created_at: course.created_at,
                    });

                    // -- set mapped_activity_id if not set
                    if (!mapped_unit.activity_ids[activity.id])
                        mapped_unit.activity_ids[activity.id] = activity_query.insertId;
                }
            }

            // -- filter out mapped unit activities that are not in the course anymore
            const activity_ids = [];
            Object.values(unit.activities || {}).forEach((activities: any) =>
                activities.forEach((a: any) => activity_ids.push(`${a.id}`)));

            Object.keys(mapped_unit.activity_ids).forEach(activity_id => {
                if (!activity_ids.includes(activity_id))
                    delete mapped_unit.activity_ids[activity_id];
            });
        }

        // -- filter out mapped units that are not in the course anymore
        const unit_ids = (course.units || []).map(u => `${u.id}`);
        Object.keys(masterygrid.units).forEach(unit_id => {
            if (!unit_ids.includes(unit_id))
                delete masterygrid.units[unit_id];
        });
    }

    // -----------

    private async _addCourse(em: EntityManager, { id, code, name, description, domain, user_email, published, created_at }) {
        return await em.query(
            'INSERT INTO ent_course (' +
            '   course_id, course_name, `desc`, course_code, ' +
            '   `domain`, creation_date, creator_id, visible' +
            ') VALUES(?, ?, ?, ?, ?, ?, ?, ?)',
            [id, name, description, code, domain, created_at, user_email, published]
        );
    }

    private async _deleteCourse(em: EntityManager, { id }) {
        return await em.query('DELETE FROM ent_course WHERE course_id = ?', [id]);
    }

    // -----------

    private async _addResource(em: EntityManager, { id, course_id, name, order, user_email, created_at }) {
        return em.query('INSERT INTO ent_resource (' +
            '   resource_id, resource_name, course_id, display_name, ' +
            '   `desc`, `order`, visible, creation_date, creator_id, ' +
            '   update_state_on, window_width, window_height' +
            ') VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 800, 420);',
            [id, name, course_id, name, '', order, 1, created_at, user_email, 0]
        );
    }

    private async _deleteResource(em: EntityManager, { id }) {
        return em.query('DELETE FROM ent_resource WHERE resource_id = ?', [id]);
    }

    // -----------

    private async _addResourceProvider(em: EntityManager, { resource_id, provider_id }) {
        return em.query('INSERT INTO rel_resource_provider (resource_id, provider_id) VALUES(?, ?);',
            [resource_id, provider_id]
        );
    }

    private async _deleteResourceProvider(em: EntityManager, { resource_id, provider_id }) {
        return em.query('DELETE FROM rel_resource_provider WHERE resource_id = ? AND provider_id = ?;',
            [resource_id, provider_id]
        );
    }

    // -----------

    private async _addUnit(em: EntityManager, { id, course_id, name, description, parent, order, user_email, published, created_at }) {
        return em.query('INSERT INTO ent_topic (' +
            '   topic_id, course_id, topic_name, display_name, ' +
            '   `desc`, parent, `order`, creation_date, ' +
            '   creator_id, visible, active' +
            ') VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [id, course_id, name, name, description, parent, order, created_at, user_email, published, published]
        );
    }

    private async _deleteUnit(em: EntityManager, { id }) {
        return em.query('DELETE FROM ent_topic WHERE topic_id = ?', [id]);
    }

    // -----------

    private async _addUnitActivity(em: EntityManager, { id, unit_id, resource_id, content_id, name, order, user_email, created_at }) {
        return em.query('INSERT INTO rel_topic_content (' +
            '   id, topic_id, resource_id, content_id, display_name, ' +
            '   display_order, creation_date, creator, visible' +
            ') VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [id, unit_id, resource_id, content_id, name, order, created_at, user_email, 1]
        );
    }

    private async _deleteUnitActivity(em: EntityManager, { id }) {
        return em.query(
            'DELETE FROM rel_topic_content WHERE id = ?',
            [id]
        );
    }
}
