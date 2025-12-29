import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HistoryOptions, CatalogV2Item } from './catalog-v2.types';

@Injectable({ providedIn: 'root' })
export class CatalogV2Service {
  constructor(private http: HttpClient) {}

  list() {
    return this.http.get<CatalogV2Item[]>(`${environment.apiUrl}/catalog-v2`);
  }

  read(id: string) {
    return this.http.get<CatalogV2Item>(
      `${environment.apiUrl}/catalog-v2/${id}`
    );
  }

  report(id: string, payload: { reason: string; details?: string }) {
    return this.http.post(
      `${environment.apiUrl}/catalog-v2/${id}/report`,
      payload,
      { withCredentials: true }
    );
  }
}
