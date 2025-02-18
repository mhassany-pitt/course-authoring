import { Component, Input, OnInit } from '@angular/core';
import { AppService } from '../app.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Router } from '@angular/router';

@Component({
  selector: 'app-user-auth-ctrl',
  templateUrl: './user-auth-ctrl.component.html',
  styleUrls: ['./user-auth-ctrl.component.less']
})
export class UserAuthCtrlComponent implements OnInit {

  moduLearn: any;

  @Input() loginRedirect = '/courses';
  @Input() logoutRedirect = '/hub';

  constructor(
    public app: AppService,
    private http: HttpClient,
    private router: Router,
  ) { }

  ngOnInit() {
    this.loadModuLearnConfigs();
  }

  loadModuLearnConfigs() {
    this.http.get(
      `${environment.apiUrl}/courses/modulearn`,
      { withCredentials: true }
    ).subscribe({
      next: (resp) => this.moduLearn = resp,
      error: (error) => console.log(error),
    });
  }

  backToModuLearn() {
    location.href = this.moduLearn.URL;
  }

  logout() {
    this.http.post(
      `${environment.apiUrl}/auth/logout`, {},
      { withCredentials: true }
    ).subscribe({
      next: () => this.app.handshake().subscribe({
        next: () => this.router.navigate([this.logoutRedirect]),
        error: (error) => console.log(error),
      }),
      error: (error) => console.log(error),
    });
  }
}
