import { Controller, Param, Put, Request, UseGuards } from '@nestjs/common';
import { MasteryGrid, MasteryGridService } from './mastery-grid.service';
import { CoursesService } from 'src/courses/courses.service';
import { toObject, useId } from 'src/utils';
import { AuthenticatedGuard } from 'src/auth/authenticated.guard';
import { DataSource } from 'typeorm';

@Controller('mastery-grid')
export class MasteryGridController {

    constructor(
        private service: MasteryGridService,
        private courses: CoursesService,
        private dataSource: DataSource,
    ) { }

    @Put(':id/sync')
    @UseGuards(AuthenticatedGuard)
    async sync(@Request() req: any, @Param('id') id: string) {
        const raw = await this.courses.load({ user_email: req.user.email, id });
        const course = useId(toObject(raw));

        if (!course.linkings)
            course.linkings = {};
        if (!course.linkings.mastery_grid)
            course.linkings.mastery_grid = {};

        const masterygrid: MasteryGrid = course.linkings.mastery_grid;
        masterygrid.units = masterygrid.units || {};
        masterygrid.resources = masterygrid.resources || {};

        try {
            await this.dataSource.transaction(async (em) => {
                await this.service.deleteCourseUnits(em, masterygrid);
                await this.service.deleteCourseResources(em, masterygrid);
                await this.service.deleteCourse(em, masterygrid);

                await this.service.addCourse(em, masterygrid, course);
                await this.service.addCourseResources(em, masterygrid, course);
                await this.service.addCourseUnits(em, masterygrid, course);
            });

            masterygrid.last_synced = new Date();
            await this.courses.update({ user_email: req.user.email, id }, { linkings: course.linkings }, true);

            return {
                id: course.linkings.mastery_grid.mapped_course_id,
                last_synced: masterygrid.last_synced,
            };
        } catch (error) {
            console.error('error syncing course', id, error);
            throw error;
        }
    }
}
