import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { DomSanitizer, Title } from '@angular/platform-browser';
import { environment } from '../../environments/environment';
import { Router } from '@angular/router';
import { AppService } from '../app.service';
import { getNavLinks } from '../utils';

@Component({
  selector: 'app-hub',
  templateUrl: './hub.component.html',
  styleUrls: ['./hub.component.less']
})
export class HubComponent implements OnInit {

  navLinks = getNavLinks(this.app);

  searchTimeout: any;
  courses: any[] = [];

  get isLoggedIn() { return !!this.app.user; }

  constructor(
    private http: HttpClient,
    public router: Router,
    private sanitizer: DomSanitizer,
    private title: Title,
    public app: AppService,
  ) { }

  ngOnInit(): void {
    this.title.setTitle('Courses Hub');
    this.search('');
  }

  search(value: string) {
    if (this.searchTimeout)
      clearTimeout(this.searchTimeout);

    this.searchTimeout = setTimeout(() => {
      this.http.get(`${environment.apiUrl}/hub?key=${value}`).subscribe(
        (resp: any) => {
          this.courses = resp;
        },
        (error: any) => console.log(error),
      );
    }, 300);
  }
}
