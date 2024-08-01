import { Routes } from '@angular/router';
import { AuthenticatedAuthorGuard } from './auth-guards/authenticated-author.guard';
import { HandshakeGuard } from './auth-guards/handshake.guard';
import { AppAdminGuard } from './auth-guards/app-admin.guard';
import { PublicGuard } from './auth-guards/public.guard';

export const routes: Routes = [
    {
        path: 'unauthorized',
        loadChildren: () => import('./unauthorized-page/unauthorized-page.module').then(m => m.UnauthorizedPageModule)
    },
    {
        path: 'courses',
        loadChildren: () => import('./courses/courses.module').then(m => m.CoursesModule),
        canActivate: [AuthenticatedAuthorGuard]
    },
    {
        path: 'courses/:id',
        loadChildren: () => import('./course/course.module').then(m => m.CourseModule),
        canActivate: [AuthenticatedAuthorGuard]
    },
    {
        path: 'hub',
        loadChildren: () => import('./hub/hub.module').then(m => m.HubModule),
        canActivate: [HandshakeGuard]
    },
    {
        path: 'user-admin',
        loadChildren: () => import('./user-admin/user-admin.module').then(m => m.UserAdminModule),
        canActivate: [AppAdminGuard]
    },
    {
        path: 'login',
        loadChildren: () => import('./login/login.module').then(m => m.LoginModule),
        canActivate: [PublicGuard]
    },
    {
        path: 'register',
        loadChildren: () => import('./register/register.module').then(m => m.RegisterModule),
        canActivate: [PublicGuard]
    },
    {
        path: 'update-password',
        loadChildren: () => import('./update-password/update-password.module').then(m => m.UpdatePasswordModule),
        canActivate: [HandshakeGuard]
    },
    { path: '**', redirectTo: 'courses' }
];
