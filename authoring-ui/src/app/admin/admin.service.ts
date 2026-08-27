import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AdminService {

  constructor(
    private http: HttpClient,
  ) { }

  list() {
    return this.http.get(`${environment.apiUrl}/user-admin`, { withCredentials: true });
  }

  create(model: any) {
    return this.http.post(`${environment.apiUrl}/user-admin`, model, { withCredentials: true });
  }

  update(model: any) {
    return this.http.patch(`${environment.apiUrl}/user-admin`, model, { withCredentials: true });
  }

  genUpdatePassTokens(emails: string[]) {
    return this.http.post(`${environment.apiUrl}/user-admin/update-password-tokens`, emails, { withCredentials: true });
  }

  createCustomCourse(course: any) {
    return this.http.post(`${environment.apiUrl}/courses/custom`, course, { withCredentials: true });
  }

  listAdminCourses(trashCan: boolean = false) {
    return this.http.get(`${environment.apiUrl}/courses/admin/all?trash_can=${trashCan}`, { withCredentials: true });
  }

  getAdminCourse(id: string) {
    return this.http.get(`${environment.apiUrl}/courses/admin/${id}`, { withCredentials: true });
  }

  updateAdminCourse(id: string, course: any) {
    return this.http.patch(`${environment.apiUrl}/courses/admin/${id}`, course, { withCredentials: true });
  }

  deleteAdminCourse(id: string, undo: boolean = false) {
    return this.http.delete(`${environment.apiUrl}/courses/admin/${id}?undo=${undo}`, { withCredentials: true });
  }

  downloadDatabaseBackup() {
    return this.http.get(`${environment.apiUrl}/user-admin/backup`, {
      withCredentials: true,
      responseType: 'blob',
    });
  }

  listApiTokens() {
    return this.http.get<any[]>(`${environment.apiUrl}/admin/api-tokens`, { withCredentials: true });
  }

  createApiToken(data: { name: string; expires_in_days?: number; expires_at?: string; user_email?: string; roles?: string[] }) {
    return this.http.post<{ token: string; record: any }>(`${environment.apiUrl}/admin/api-tokens`, data, { withCredentials: true });
  }

  revokeApiToken(id: string) {
    return this.http.delete(`${environment.apiUrl}/admin/api-tokens/${id}`, { withCredentials: true });
  }

  toggleApiToken(id: string, active?: boolean) {
    return this.http.patch(`${environment.apiUrl}/admin/api-tokens/${id}/toggle`, { active }, { withCredentials: true });
  }
}

