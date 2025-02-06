import { AppService } from "./app.service";

export const any = (v: any): any => v;

export const getNavLinks = (app: AppService) => {
  return [
    { label: 'Hub', value: '/hub' },
    { label: 'Courses', value: '/courses' },
    (app.user?.roles?.includes('app-admin') ? { label: 'Users', value: '/user-admin' } : null),
  ].filter(l => l);
};

export const mapToTreeNodes = (
  nodes: any[],
  map = (node: any) => ({ ...node.element._data, children: mapToTreeNodes(node.subnodes) })
): any[] => {
  return nodes ? nodes.map(map) : [];
}

export const getPreviewLink = (user: any, url: string) => {
  return `${url}&usr=${user.email}&grp=preview&sid=preview`;
}
