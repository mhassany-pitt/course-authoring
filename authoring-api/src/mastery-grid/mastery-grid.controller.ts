import { Controller, Param, Put, Request, UseGuards } from '@nestjs/common';
import { Aggregate, MasteryGridService, PortalTest2, UserModeling2 } from './mastery-grid.service';
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
        const linkings = course.linkings;

        if (!linkings.aggregate) linkings.aggregate = {};
        if (!linkings.portal_test2) linkings.portal_test2 = {};
        if (!linkings.user_modeling2) linkings.user_modeling2 = {};
        if (!linkings.ptum2_passwords) linkings.ptum2_passwords = {};

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

                await this.service.agg_addGroupIfNotExists(agg, mapping, course);
            });

            await checkpoint();

            const students = course.students
                ? await parse(course.students, {
                    bom: true, columns: true, trim: true, skip_empty_lines: true
                }).toArray()
                : [];

            await this.service.setStudentPasswords(students, linkings.ptum2_passwords);

            await checkpoint();

            await this.portal_test2.transaction(async pt2 => {
                const mapping: PortalTest2 = linkings.portal_test2;
                mapping.mapped_group_mnemonic = linkings.aggregate.mapped_group_mnemonic;
                await this.service.pt2_addTeacherIfNotExists(pt2, req.user, mapping);
                await this.service.pt2_addGroupIfNotExists(pt2, mapping, course.name);
                await this.service.pt2_syncGroupStudents(pt2, mapping, students);
            });

            await checkpoint();

            await this.user_modeling2.transaction(async um2 => {
                const mapping: UserModeling2 = linkings.user_modeling2;
                mapping.mapped_group_mnemonic = linkings.aggregate.mapped_group_mnemonic;
                await this.service.um2_addGroupIfNotExists(um2, mapping, course.name);
                await this.service.um2_syncGroupApps(um2, mapping, course.resources);
                await this.service.um2_syncGroupStudents(um2, mapping, students);
            });

            await checkpoint();

            return { students: stringify(students, { header: true }) };
        } catch (error) {
            console.error('error syncing course', id, error);
            throw error;
        }
    }
}
