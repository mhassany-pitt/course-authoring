import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Course } from 'src/courses/course.schema';
import { validate } from 'email-validator';
import { nanoid } from 'nanoid';

@Injectable()
export class MasteryGridService {

    async agg_addCreatorIfNotExists(agg: EntityManager, user: User) {
        return await agg.query(
            'INSERT INTO ent_creator (creator_id, creator_name, affiliation, affiliation_code) ' +
            'VALUES (?, ?, "", "") ON DUPLICATE KEY UPDATE creator_name = ?',
            [user.email, user.fullname, user.fullname]
        );
    }

    async agg_deleteCourse(agg: EntityManager, mapping_agg: Aggregate) {
        if (mapping_agg.mapped_course_id)
            await this._deleteCourse(agg, {
                id: mapping_agg.mapped_course_id
            });
    }

    async agg_deleteCourseResources(agg: EntityManager, mapping_agg: Aggregate) {
        for (const resource of Object.values(mapping_agg.resources)) {
            resource.provider_ids = resource.provider_ids || [];
            for (const provider_id of resource.provider_ids)
                await this._deleteResourceProvider(agg, {
                    resource_id: resource.mapped_resource_id,
                    provider_id, // provider_id is loaded from the aggregate db
                });
            await this._deleteResource(agg, { id: resource.mapped_resource_id });
        }
    }

    async agg_deleteCourseUnits(agg: EntityManager, mapping_agg: Aggregate) {
        for (const unit of Object.values(mapping_agg.units)) {
            unit.activity_ids = unit.activity_ids || {};
            for (const activity_id of Object.values(unit.activity_ids))
                await this._deleteUnitActivity(agg, { id: activity_id });
            await this._deleteUnit(agg, { id: unit.mapped_unit_id });
        }
    }

    async agg_addCourse(agg: EntityManager, mapping_agg: Aggregate, course: Course) {
        const course_query = await this._addCourse(agg, {
            id: mapping_agg.mapped_course_id,
            code: course.code?.substring(0, 50),
            name: course.name?.substring(0, 100),
            description: course.description?.substring(0, 500),
            domain: course.domain?.substring(0, 50),
            user_email: course.user_email?.substring(0, 50),
            published: !!course.published,
            created_at: course.created_at,
        });

        if (!mapping_agg.mapped_course_id)
            mapping_agg.mapped_course_id = course_query.insertId;
    }

    async agg_addCourseResources(agg: EntityManager, mapping_agg: Aggregate, course: Course) {
        let r_order = 1;
        for (const resource of (course.resources || [])) {
            if (`${resource.id}` in mapping_agg.resources == false)
                mapping_agg.resources[`${resource.id}`] = { mapped_resource_id: null, provider_ids: [] };

            const mapped_resource = mapping_agg.resources[`${resource.id}`];
            const resource_query = await this._addResource(agg, {
                id: mapped_resource.mapped_resource_id,
                course_id: mapping_agg.mapped_course_id,
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
                await this._addResourceProvider(agg, {
                    resource_id: mapped_resource.mapped_resource_id,
                    provider_id: provider.id, // provider.id is loaded from the aggregate db
                });
                if (mapped_resource.provider_ids.includes(provider.id) == false)
                    mapped_resource.provider_ids.push(provider.id);
            }
        }

        // -- filter out mapped resources that are not in the course anymore
        const resource_ids = (course.resources || []).map(r => `${r.id}`);
        Object.keys(mapping_agg.resources).forEach(resource_id => {
            if (!resource_ids.includes(resource_id))
                delete mapping_agg.resources[resource_id];
        });
    }

    async agg_addCourseUnits(agg: EntityManager, mapping_agg: Aggregate, course: Course) {
        let u_order = 1;
        const parent_mapped_unit_ids = {};
        for (const unit of (course.units || [])) {
            if (`${unit.id}` in mapping_agg.units == false)
                mapping_agg.units[`${unit.id}`] = { mapped_unit_id: null, activity_ids: {} };

            const mapped_unit = mapping_agg.units[`${unit.id}`];
            const unit_query = await this._addUnit(agg, {
                id: mapped_unit.mapped_unit_id,
                course_id: mapping_agg.mapped_course_id,
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
                    if (`${activity.id}` in mapped_unit.activity_ids == false)
                        mapped_unit.activity_ids[`${activity.id}`] = null;

                    const activity_query = await this._addUnitActivity(agg, {
                        id: mapped_unit.activity_ids[`${activity.id}`],
                        unit_id: mapped_unit.mapped_unit_id,
                        resource_id: mapping_agg.resources[resource_id].mapped_resource_id,
                        content_id: `${activity.id}`,
                        name: activity.name?.substring(0, 100),
                        order: a_order++,
                        user_email: course.user_email?.substring(0, 50),
                        created_at: course.created_at,
                    });

                    // -- set mapped_activity_id if not set
                    if (!mapped_unit.activity_ids[`${activity.id}`])
                        mapped_unit.activity_ids[`${activity.id}`] = activity_query.insertId;
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
        Object.keys(mapping_agg.units).forEach(unit_id => {
            if (!unit_ids.includes(unit_id))
                delete mapping_agg.units[unit_id];
        });
    }

    async agg_addGroupIfNotExists(agg: EntityManager, mapping_agg: Aggregate, group: Group, course: Course) {
        if (`${group.id}` in mapping_agg.groups) {
            await agg.query(
                'UPDATE ent_group SET group_id = ?, group_name = ? WHERE group_id = ?',
                [group.mnemonic, group.name, mapping_agg.groups[`${group.id}`]]
            );
            mapping_agg.groups[`${group.id}`] = group.mnemonic;
        } else {
            await agg.query(
                'INSERT INTO ent_group (group_id, group_name, course_id, creation_date, term, year) ' +
                'VALUES (?, ?, ?, NOW(), ?, ?)',
                [group.mnemonic, group.name, mapping_agg.mapped_course_id, course.term, course.year]
            );
            mapping_agg.groups[`${group.id}`] = group.mnemonic;
        }
    }

    async setStudentPasswords(students: any[], passwords: any) {
        for (const student of students) {
            if (!validate(student.email))
                continue;

            if (student.email in passwords == false)
                passwords[student.email] = nanoid(8);
            student.password = passwords[student.email];
            student.keep_password = student.remark?.toLowerCase().includes('keep_password');
        }
    }

    async pt2_addTeacherIfNotExists(pt2: EntityManager, user: User, mapping_pt2: PortalTest2) {
        if (!mapping_pt2.mapped_teacher_id) {
            mapping_pt2.mapped_teacher_id = (await pt2.query(
                'INSERT INTO ent_user (Login, Name, Pass, IsGroup, Sync, EMail, Organization, City, Country, How, IsInstructor) ' +
                'VALUES (?, ?, "", 0, 1, ?, "", "", "", "", 1) ON DUPLICATE KEY UPDATE Name = ?, EMail = ?, IsInstructor = 1',
                [user.email, user.fullname, user.email, user.fullname, user.email]
            )).insertId;
        }
    }

    async pt2_addGroupIfNotExists(pt2: EntityManager, mapping_pt2: PortalTest2, group: Group) {
        if (`${group.id}` in mapping_pt2.groups) {
            await this._updateGroup(pt2, group, mapping_pt2.groups[`${group.id}`]);
        } else {
            mapping_pt2.groups[`${group.id}`] = (await this._addGroup(pt2, group)).insertId;
        }
    }

    async pt2_syncGroupStudents(pt2: EntityManager, mapped_group_id: number, students: any[]) {
        const pt2_userIds = [];
        for (const student of students) {
            // skip if email is invalid
            if (!validate(student.email)) {
                student.results = 'email address is invalid!';
                continue;
            }

            // insert or get user id for pt2
            const pt2_user = await this._getUser(pt2, student.email);
            const pt2_userId = pt2_user?.UserID || (await this._pt2_addStudents(pt2, student)).insertId;
            pt2_userIds.push(pt2_userId);

            // ensure password is updated
            if (!student.keep_password)
                await pt2.query(
                    'UPDATE ent_user SET Pass = MD5(?) WHERE UserID = ?',
                    [student.password, pt2_userId]
                );

            // insert student into group if not already there
            if (!pt2_user) pt2.query(
                'INSERT INTO rel_user_user (ParentUserID, ChildUserID) VALUES (?, ?)',
                [mapped_group_id, pt2_userId]
            );

            student.results = pt2_user ? 'student added!' : 'new student added!';
        }

        if (pt2_userIds.length < 1)
            pt2_userIds.push(-1); // ensure NOT IN clause works

        // delete students not in the csv file from pt2
        await pt2.query(
            'DELETE FROM rel_user_user WHERE ParentUserID = ? AND ChildUserID NOT IN (?)',
            [mapped_group_id, pt2_userIds]
        );
    }

    private async _pt2_addStudents(pt2: EntityManager, student: any) {
        return await pt2.query(
            'INSERT INTO ent_user (Login, Name, Pass, IsGroup, Sync, EMail, Organization, City, Country, How, IsInstructor) ' +
            'VALUES (?, ?, MD5(?), 0, 1, ?, ?, ?, ?, "", 0)',
            [student.email, student.fullname, student.password, student.email, '', '', '']
        );
    }

    async um2_addGroupIfNotExists(um2: EntityManager, mapping_um2: UserModeling2, group: Group) {
        if (`${group.id}` in mapping_um2.groups) {
            await this._updateGroup(um2, group, mapping_um2.groups[`${group.id}`]);
        } else {
            mapping_um2.groups[`${group.id}`] = (await this._addGroup(um2, group)).insertId;
        }
    }

    async um2_syncGroupApps(um2: EntityManager, mapped_group_id: number, resources: any) {
        // delete all apps for the group
        await um2.query(
            'DELETE FROM rel_app_user WHERE UserID = ?;',
            [mapped_group_id]
        );

        // find all unique provider ids
        const providerIds = new Set<string>();
        for (const resource of (resources || []))
            for (const provider of (resource.providers || []))
                providerIds.add(provider.id.trim())

        // always ensure unknown-app is added
        providerIds.add('this-is-just-a-fake-provider-id-for-unknown-app');

        // insert all apps for the group
        const appIds = new Set<string>();
        for (const providerId of providerIds) {
            const appId = PROVIDER_TO_APPID[providerId] || 1;
            if (appId in appIds)
                continue;

            await um2.query(
                'INSERT INTO rel_app_user (UserID, AppID) VALUES (?, ?)',
                [mapped_group_id, appId]
            );

            appIds.add(appId);
        }
    }

    async um2_syncGroupStudents(um2: EntityManager, mapped_group_id: number, students: any[]) {
        const um2_userIds = [];
        for (const student of students) {
            // skip if email is invalid
            if (!validate(student.email)) {
                student.results = 'email address is invalid!';
                continue;
            }

            // insert or get user id for um2
            const um2_user = await this._getUser(um2, student.email);
            const um2_userId = um2_user?.UserID || (await this._um2_addStudents(um2, student)).insertId;
            um2_userIds.push(um2_userId);

            // ensure password is updated
            if (!student.keep_password)
                await um2.query(
                    'UPDATE ent_user SET Pass = MD5(?) WHERE UserID = ?',
                    [student.password, um2_userId]
                );

            // insert student into group if not already there
            if (!um2_user) um2.query(
                'INSERT INTO rel_user_user (GroupID, UserID) VALUES (?, ?)',
                [mapped_group_id, um2_userId]
            );

            student.results = um2_user ? 'student added!' : 'new student added!';
        }


        if (um2_userIds.length < 1)
            um2_userIds.push(-1); // ensure NOT IN clause works

        // delete students not in the csv file from um2
        await um2.query(
            'DELETE FROM rel_user_user WHERE GroupID = ? AND UserID NOT IN (?)',
            [mapped_group_id, um2_userIds]
        );
    }

    private async _um2_addStudents(um2: EntityManager, student: any) {
        return await um2.query(
            'INSERT INTO ent_user (Login, Name, Pass, IsGroup, Sync, EMail, Organization, City, Country, How) ' +
            'VALUES (?, ?, MD5(?), 0, 1, ?, ?, ?, ?, "")',
            [student.email, student.fullname, student.password, student.email, '', '', '']
        );
    }

    private async _getUser(db: EntityManager, email: string) {
        const result = await db.query('SELECT UserID FROM ent_user WHERE EMail = ?', [email]);
        return result.length ? result[0] : null;
    }

    private async _addGroup(db: EntityManager, group: Group) {
        return await db.query(
            'INSERT INTO ent_user (Login, Name, Pass, IsGroup, Sync, EMail, Organization, City, Country, How) ' +
            'VALUES (?, ?, "", 1, 1, "", "", "", "", "")',
            [group.mnemonic, group.name]
        );
    }

    private async _updateGroup(db: EntityManager, group: Group, mapped_group_id: number) {
        return await db.query(
            'UPDATE ent_user SET Login = ?, Name = ? WHERE UserID = ?',
            [group.mnemonic, group.name, mapped_group_id]
        );
    }

    // -----------

    private async _addCourse(agg: EntityManager, { id, code, name, description, domain, user_email, published, created_at }) {
        return await agg.query(
            'INSERT INTO ent_course (' +
            '   course_id, course_name, `desc`, course_code, ' +
            '   `domain`, creation_date, creator_id, visible' +
            ') VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [id, name, description, code, domain, created_at, user_email, published]
        );
    }

    private async _deleteCourse(agg: EntityManager, { id }) {
        return await agg.query('DELETE FROM ent_course WHERE course_id = ?', [id]);
    }

    // -----------

    private async _addResource(agg: EntityManager, { id, course_id, name, order, user_email, created_at }) {
        return agg.query('INSERT INTO ent_resource (' +
            '   resource_id, resource_name, course_id, display_name, ' +
            '   `desc`, `order`, visible, creation_date, creator_id, ' +
            '   update_state_on, window_width, window_height' +
            ') VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 800, 420)',
            [id, name, course_id, name, '', order, 1, created_at, user_email, 0]
        );
    }

    private async _deleteResource(agg: EntityManager, { id }) {
        return agg.query('DELETE FROM ent_resource WHERE resource_id = ?', [id]);
    }

    // -----------

    private async _addResourceProvider(agg: EntityManager, { resource_id, provider_id }) {
        return agg.query('INSERT INTO rel_resource_provider (resource_id, provider_id) VALUES (?, ?)',
            [resource_id, provider_id]
        );
    }

    private async _deleteResourceProvider(agg: EntityManager, { resource_id, provider_id }) {
        return agg.query('DELETE FROM rel_resource_provider WHERE resource_id = ? AND provider_id = ?;',
            [resource_id, provider_id]
        );
    }

    // -----------

    private async _addUnit(agg: EntityManager, { id, course_id, name, description, parent, order, user_email, published, created_at }) {
        return agg.query('INSERT INTO ent_topic (' +
            '   topic_id, course_id, topic_name, display_name, ' +
            '   `desc`, parent, `order`, creation_date, ' +
            '   creator_id, visible, active' +
            ') VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [id, course_id, name, name, description, parent, order, created_at, user_email, published, published]
        );
    }

    private async _deleteUnit(agg: EntityManager, { id }) {
        return agg.query('DELETE FROM ent_topic WHERE topic_id = ?', [id]);
    }

    // -----------

    private async _addUnitActivity(agg: EntityManager, { id, unit_id, resource_id, content_id, name, order, user_email, created_at }) {
        return agg.query('INSERT INTO rel_topic_content (' +
            '   id, topic_id, resource_id, content_id, display_name, ' +
            '   display_order, creation_date, creator, visible' +
            ') VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [id, unit_id, resource_id, content_id, name, order, created_at, user_email, 1]
        );
    }

    private async _deleteUnitActivity(agg: EntityManager, { id }) {
        return agg.query(
            'DELETE FROM rel_topic_content WHERE id = ?',
            [id]
        );
    }
}

const PROVIDER_TO_APPID = {
    'animatedexamples': 35,
    'codecheck': 56,
    'codelab': 52,
    'codeocean': 54,
    'codeworkout': 49,
    'ctat': 50,
    'dbqa': 53,
    'educvideos': 40,
    'mchq': 42,
    'parsons': 48,
    'pcex': 46,
    'pcex_ch': 47,
    'pcrs': 44,
    'quizjet': 25,
    'quizpack': 2,
    'quizpet': 41,
    'readingmirror': 55,
    'salt': 37,
    'sqlknot': 23,
    'sqltutor': 19,
    'webex': 3,
    'video': 1,
    'pcex_activities': 1,
};

export interface User {
    email: string;
    fullname: string;
}

export interface Aggregate {
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
    groups: {
        [id: number]: string; // mnemonic
    };
}

export interface PortalTest2 {
    mapped_teacher_id: number;
    groups: {
        [id: number]: number; // mapped_group_id
    };
}

export interface UserModeling2 {
    groups: {
        [id: number]: number; // mapped_group_id
    };
}

// export interface MappedGroup {
//     mapped_group_id?: number;
//     mapped_group_mnemonic?: string;
// }

export interface Group {
    id: number;
    mnemonic: string;
    name: string;
    students: any[];
}

export interface Linkings {
    aggregate: Aggregate;
    portal_test2: PortalTest2;
    user_modeling2: UserModeling2;
    ptum2_passwords: { [group_id: number]: { [student_id: string]: string } };
    last_synced: Date;
}
