import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { CatalogV2Item, HistoryOptions } from '../catalog_v2/catalog-v2.types';

@Injectable({ providedIn: 'root' })
export class CatalogV2Service {
  constructor(private http: HttpClient) {}

  list() {
    return this.http.get<CatalogV2Item[]>(`${environment.apiUrl}/slc-items`, {
      withCredentials: true,
    });
  }

  create(item: Partial<CatalogV2Item>) {
    return this.http.post<CatalogV2Item>(
      `${environment.apiUrl}/slc-items`,
      item,
      {
        withCredentials: true,
      }
    );
  }

  update(item: CatalogV2Item) {
    return this.http.patch<CatalogV2Item>(
      `${environment.apiUrl}/slc-items/${item.id}`,
      item,
      { withCredentials: true }
    );
  }

  read(id: string) {
    return this.http.get<CatalogV2Item>(
      `${environment.apiUrl}/slc-items/${id}`,
      {
        withCredentials: true,
      }
    );
  }

  options() {
    return this.http.get<HistoryOptions>(
      `${environment.apiUrl}/slc-items/options`,
      { withCredentials: true }
    );
  }
}
