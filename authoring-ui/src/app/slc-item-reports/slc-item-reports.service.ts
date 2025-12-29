import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { SlcItemReport } from './slc-item-reports.types';

@Injectable({ providedIn: 'root' })
export class SlcItemReportsService {
  constructor(private http: HttpClient) {}

  list() {
    return this.http.get<SlcItemReport[]>(
      `${environment.apiUrl}/slc-items/reports`,
      { withCredentials: true }
    );
  }

  update(id: string, payload: Partial<SlcItemReport>) {
    return this.http.patch<SlcItemReport>(
      `${environment.apiUrl}/slc-items/reports/${id}`,
      payload,
      { withCredentials: true }
    );
  }
}
