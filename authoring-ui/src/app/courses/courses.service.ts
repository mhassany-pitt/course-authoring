import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { NGX_LOADING_BAR_IGNORED } from '@ngx-loading-bar/http-client';

@Injectable({
  providedIn: 'root'
})
export class CoursesService {

  previewJsons: any = {};
  isGeneratingPreviewJson(id: string) { return id in this.previewJsons; }

  constructor(
    private http: HttpClient
  ) { }

  courses({ trash_can }: any) {
    return this.http.get(`${environment.apiUrl}/courses${trash_can ? '?trash_can=true' : ''}`, { withCredentials: true });
  }

  create() {
    return this.http.post(`${environment.apiUrl}/courses`, {}, { withCredentials: true });
  }

  read(id: string) {
    return this.http.get(`${environment.apiUrl}/courses/${id}`, { withCredentials: true });
  }

  update(course: any) {
    return this.http.patch(`${environment.apiUrl}/courses/${course.id}`, course, { withCredentials: true });
  }

  delete(id: string, undo: boolean) {
    return this.http.delete(`${environment.apiUrl}/courses/${id}${undo ? '?undo=true' : ''}`, { withCredentials: true });
  }

  domains() {
    return this.http.get(`${environment.apiUrl}/aggregate/domains`, { withCredentials: true });
  }

  authors() {
    return this.http.get(`${environment.apiUrl}/aggregate/authors`, { withCredentials: true });
  }

  providers(domainId: string) {
    return this.http.get(`${environment.apiUrl}/aggregate/providers?domain_id=${domainId}`, { withCredentials: true });
  }

  activities(domainId: string, providerId: string) {
    return this.http.get(`${environment.apiUrl}/aggregate/activites?domain_id=${domainId}&provider_id=${providerId}`, { withCredentials: true });
  }

  syncToMasteryGrid(id: string) {
    return this.http.put(`${environment.apiUrl}/mastery-grid/${id}/sync`, {}, { withCredentials: true });
  }

  clone(id: string) {
    return this.http.post(`${environment.apiUrl}/courses/${id}/clone`, {}, { withCredentials: true });
  }

  getModuLearnConfigs() {
    return this.http.get(`${environment.apiUrl}/courses/modulearn`, { withCredentials: true });
  }
}
