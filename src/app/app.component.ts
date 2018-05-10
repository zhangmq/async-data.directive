import { Component, ChangeDetectionStrategy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { delay, map } from 'rxjs/operators';
import { of } from 'rxjs/observable/of';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  title = 'app';

  keywords: '';

  constructor(private http: HttpClient) {}

  fetchUsers = (params: string) =>
    of(['abc', 'bcd', 'cde', 'efg'].filter(item => item.indexOf(params || '') >= 0)).pipe(delay(500));
}
