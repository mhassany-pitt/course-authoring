import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { ContentDto } from './content.dto';
import { CourseDto } from './course.dto';

@Injectable({ providedIn: 'root' })
export class CatalogService {

  constructor(
    private http: HttpClient,
  ) { }

  getContents() {
    return this.http.get<ContentDto[]>(`${environment.apiUrl}/catalog/contents`, { withCredentials: true });
  }

  getCourses(contentId: number) {
    return this.http.get<CourseDto[]>(`${environment.apiUrl}/catalog/contents/${contentId}/courses`, { withCredentials: true });
  }

  getConcepts(contentId: number) {
    return this.http.get<any[]>(`${environment.apiUrl}/catalog/contents/${contentId}/concepts`, { withCredentials: true });
  }
}
