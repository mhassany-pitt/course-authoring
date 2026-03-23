import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HistoryOptions, CatalogV2Item } from './catalog-v2.types';
import { finalize, Observable, of, shareReplay, tap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class CatalogV2Service {
  private listCache = new Map<string, {
    items?: CatalogV2Item[];
    inFlight$?: Observable<CatalogV2Item[]>;
    lastLoadedAt?: Date;
  }>();

  constructor(private http: HttpClient) {}

  list(options: { force?: boolean; attrs?: string[] | string } = {}) {
    const key = this.getListCacheKey(options.attrs);
    const entry = this.listCache.get(key) || {};

    if (!options.force && entry.items) {
      return of(entry.items);
    }

    if (!options.force && entry.inFlight$) {
      return entry.inFlight$;
    }

    let params = new HttpParams();
    const attrs = Array.isArray(options.attrs) ? options.attrs.join(',') : (options.attrs || '');
    if (attrs) {
      params = params.set('attrs', attrs);
    }

    const request$ = this.http
      .get<CatalogV2Item[]>(`${environment.apiUrl}/catalog-v2`, { params })
      .pipe(
        tap((items) => {
          entry.items = items;
          entry.lastLoadedAt = new Date();
        }),
        finalize(() => {
          entry.inFlight$ = undefined;
        }),
        shareReplay(1),
      );

    entry.inFlight$ = request$;
    this.listCache.set(key, entry);
    return request$;
  }

  getLastLoadedAt(attrs?: string[] | string) {
    return this.listCache.get(this.getListCacheKey(attrs))?.lastLoadedAt || null;
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

  private getListCacheKey(attrs?: string[] | string) {
    if (Array.isArray(attrs)) {
      return attrs.join(',');
    }
    return attrs || '';
  }
}
