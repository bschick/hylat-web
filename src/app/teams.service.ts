import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';

import { Observable } from 'rxjs';

export interface Teams {
  team_count: number;
  player_count: number;
  drop_count: number;
  tries: number;
  teams: string;
}

export interface Params {
  [param: string]:
    | string
    | number
    | boolean
    | ReadonlyArray<string | number | boolean>;
}

@Injectable()
export class TeamsService {
  url = 'https://oh3f2e7ju5rje27wmhudbnkoci0ofqwb.lambda-url.us-east-1.on.aws/'; // URL to web api

  constructor(private http: HttpClient) {}

  getTeams(people: string, params: Params): Observable<Teams> {
    people = people.trim();
    // this is needed to prevent the post from doing an OPTION preflight which it
    // looks like lambda function URLs does not support.
    const options = {
      params: new HttpParams().appendAll(params),
      headers: new HttpHeaders()
        .set('Content-Type', 'text/plain')
        .set('Accept', 'application/json'),
    };

    return this.http.post<Teams>(this.url, people, options);
  }
}

/*
Copyright Google LLC. All Rights Reserved.
Use of this source code is governed by an MIT-style license that
can be found in the LICENSE file at https://angular.io/license
*/
