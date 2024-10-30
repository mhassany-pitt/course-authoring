import { Controller, Param, Put, Request, UseGuards } from '@nestjs/common';
import { Aggregate, Group, Linkings, MasteryGridService } from './mastery-grid.service';
import { DataSource } from 'typeorm';
import { toObject, useId } from 'src/utils';
import { InjectDataSource } from '@nestjs/typeorm';
import { parse } from 'csv-parse';
import { CoursesService } from 'src/courses/courses.service';
import { AuthenticatedGuard } from 'src/auth/authenticated.guard';
import { stringify } from 'csv-stringify/sync';

@Controller('mastery-grid')
export class MasteryGridController {

    constructor(
        private service: MasteryGridService,
        private courses: CoursesService,
        @InjectDataSource('aggregate') private aggregate: DataSource,
        @InjectDataSource('um2') private user_modeling2: DataSource,
        @InjectDataSource('portal_test2') private portal_test2: DataSource,
    ) { }

    @Put(':id/sync')
    @UseGuards(AuthenticatedGuard)
    async sync(@Request() req: any, @Param('id') id: string) {
        const raw = await this.courses.load({ user_email: req.user.email, id });
        const course = useId(toObject(raw));

        if (!course.linkings)
            course.linkings = {};
        const linkings: Linkings = course.linkings;

        linkings.aggregate = linkings.aggregate || {} as any;
        linkings.aggregate.groups = linkings.aggregate.groups || {};
        linkings.portal_test2 = linkings.portal_test2 || {} as any;
        linkings.portal_test2.groups = linkings.portal_test2.groups || {};
        linkings.portal_test2.student_ids = linkings.portal_test2.student_ids || {};
        linkings.user_modeling2 = linkings.user_modeling2 || {} as any;
        linkings.user_modeling2.groups = linkings.user_modeling2.groups || {};
        linkings.user_modeling2.app_ids = linkings.user_modeling2.app_ids || {};
        linkings.user_modeling2.student_ids = linkings.user_modeling2.student_ids || {};
        linkings.ptum2_passwords = linkings.ptum2_passwords || {} as any;

        try {
            const checkpoint = async () => {
                linkings.last_synced = new Date();
                await this.courses.update({ user_email: req.user.email, id }, { linkings }, true);
            };

            await this.aggregate.transaction(async agg => {
                const mapping: Aggregate = linkings.aggregate;
                mapping.units = mapping.units || {};
                mapping.resources = mapping.resources || {};

                await this.service.agg_deleteCourseUnits(agg, mapping);
                await this.service.agg_deleteCourseResources(agg, mapping);
                await this.service.agg_deleteCourse(agg, mapping);

                await this.service.agg_addCreatorIfNotExists(agg, req.user);

                await this.service.agg_addCourse(agg, mapping, course);
                await this.service.agg_addCourseResources(agg, mapping, course);
                await this.service.agg_addCourseUnits(agg, mapping, course);
            });

            await checkpoint();

            await this.portal_test2.transaction(async pt2 => {
                await this.service.pt2_addTeacherIfNotExists(pt2, req.user, linkings.portal_test2);
            });

            await checkpoint();

            const students = [];
            for (let i = 0; i < course.groups.length; i++) {
                const group: Group = course.groups[i];

                group.students = course.groups[i].students
                    ? await parse(course.groups[i].students, {
                        bom: true, columns: true, trim: true, skip_empty_lines: true
                    }).toArray()
                    : [];

                const grp_passwords = linkings.ptum2_passwords[`${group.id}`] || {};
                linkings.ptum2_passwords[`${group.id}`] = grp_passwords;
                await this.service.setStudentPasswords(group.students, grp_passwords);

                await this.aggregate.transaction(async agg => {
                    await this.service.agg_addGroupIfNotExists(agg, linkings.aggregate, group, course);
                });

                await checkpoint();

                await this.portal_test2.transaction(async pt2 => {
                    await this.service.pt2_addGroupIfNotExists(pt2, linkings.portal_test2, group);
                    if (group.id in linkings.portal_test2.student_ids === false)
                        linkings.portal_test2.student_ids[`${group.id}`] = [];
                    await this.service.pt2_syncGroupStudents(pt2, linkings.portal_test2.groups[`${group.id}`], linkings.portal_test2.student_ids[`${group.id}`], group.students);
                });

                await checkpoint();

                await this.user_modeling2.transaction(async um2 => {
                    await this.service.um2_addGroupIfNotExists(um2, linkings.user_modeling2, group);
                    if (group.id in linkings.user_modeling2.app_ids === false)
                        linkings.user_modeling2.app_ids[`${group.id}`] = [];
                    await this.service.um2_syncGroupApps(um2, linkings.user_modeling2.groups[`${group.id}`], linkings.user_modeling2.app_ids[`${group.id}`], course.resources);
                    if (group.id in linkings.user_modeling2.student_ids === false)
                        linkings.user_modeling2.student_ids[`${group.id}`] = [];
                    await this.service.um2_syncGroupStudents(um2, linkings.user_modeling2.groups[`${group.id}`], linkings.user_modeling2.student_ids[`${group.id}`], group.students);
                });

                await checkpoint();

                for (const student of group.students) {
                    const { fullname, email, results, keep_password } = student;
                    const password = keep_password ? '[password was not changed]' : student.password;
                    students.push({ group: `${group.mnemonic} - ${group.name}`, fullname, email, password, results });
                }
            }

            return { students: stringify(students, { header: true }) };
        } catch (error) {
            console.error('error syncing course', id, error);
            throw error;
        }
    }
}
