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

  samples() {
    return this.http.get(`${environment.apiUrl}/courses/samples`, { withCredentials: true });
  }

  courses({ archived }: any) {
    return this.http.get(`${environment.apiUrl}/courses${archived ? '?include=archived' : ''}`, { withCredentials: true });
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

  log(id: string, log: any) {
    return this.http.post(`${environment.apiUrl}/courses/${id}/log`, log,
      { withCredentials: true, context: new HttpContext().set(NGX_LOADING_BAR_IGNORED, true) });
  }
}
