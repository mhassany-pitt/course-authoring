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

  providers() {
    return this.http.get(`${environment.apiUrl}/providers`, { withCredentials: true });
  }

  activities(url: string) {
    return this.http.get(url, { withCredentials: true });
  }
}