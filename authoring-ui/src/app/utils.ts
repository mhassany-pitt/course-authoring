import { AppService } from "./app.service";

export const getNavLinks = (app: AppService) => {
    return [
        { label: 'Hub', value: '/hub' },
        { label: 'Courses', value: '/courses' },
        (app.user?.roles?.includes('app-admin') ? { label: 'Users', value: '/user-admin' } : null),
    ].filter(l => l);
};