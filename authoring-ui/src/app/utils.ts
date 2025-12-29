import { AppService } from './app.service';

export const any = (v: any): any => v;

export const getNavLinks = (app: AppService) => {
  return [
    { label: 'Hub', value: '/hub' },
    { label: 'SLCs Catalog', value: '/catalog-v2' },
    app.user?.roles?.includes('author')
      ? { label: 'My Courses', value: '/courses' }
      : null,
    app.user?.roles?.includes('author')
      ? { label: 'My SLCs', value: '/slc-items' }
      : null,
    app.user?.roles?.includes('app-admin')
      ? { label: 'SLC Reports', value: '/slc-item-reports' }
      : null,
    app.user?.roles?.includes('app-admin')
      ? { label: 'Users', value: '/user-admin' }
      : null,
  ].filter((l) => l);
};

export const mapToTreeNodes = (
  nodes: any[],
  map = (node: any) => ({
    ...node.element._data,
    children: mapToTreeNodes(node.subnodes),
  })
): any[] => {
  return nodes ? nodes.map(map) : [];
};

export const getPreviewLink = (user: any, url: string) => {
  return `${url}${url.includes('?') ? '&' : '?'}usr=${
    user.email
  }&grp=preview&sid=preview`;
};
