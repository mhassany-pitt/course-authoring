import { Controller, Param, Put, UseGuards } from '@nestjs/common';
import { MGridLinking, MasteryGridService } from './mastery-grid.service';
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
    async sync(@Param('id') id: string) {
        if (true) return;

        const course = useId(toObject(await this.courses.load(id)));

        if (!course.linkings)
            course.linkings = {};
        if (!course.linkings.mastery_grid)
            course.linkings.mastery_grid = {};

        const masterygrid: MGridLinking = course.linkings.mastery_grid;
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

            await this.courses.update(id, { linkings: course.linkings });

            return { id: course.linkings.mastery_grid.mapped_course_id };

            // add a button to the ui which call this endpoint
            // then it syncs and redirect to user the mastery grid course 
            // show the last sync date and let the user decide when to sync
            // this is a new version of the course authoring, maybe this sync is part of saving the course?!
            // maybe this needs to be done only when course is published?! or deleted?!

            // how about group-authoring?
        } catch (error) {
            console.error('error syncing course', id);
            console.error(error);
            throw error;
        }
    }
}
