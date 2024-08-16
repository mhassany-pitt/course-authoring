import { AppService } from "./app.service";

export const any = (v: any): any => v;

export const getNavLinks = (app: AppService) => {
  return [
    { label: 'Hub', value: '/hub' },
    { label: 'Courses', value: '/courses' },
    (app.user?.roles?.includes('app-admin') ? { label: 'Users', value: '/user-admin' } : null),
  ].filter(l => l);
};

export const mapToTreeNodes = (nodes: any[]): any[] => {
  return nodes ? nodes.map(node => ({
    ...node.element._data,
    children: mapToTreeNodes(node.subnodes),
  })) : [];
}
