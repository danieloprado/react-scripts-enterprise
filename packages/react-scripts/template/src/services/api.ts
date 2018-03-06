import axios, { AxiosResponse } from 'axios';
import { ApiError } from 'errors/api';
import { dateFormatter } from 'formatters/date';
import { Observable } from 'rxjs';
import * as authService from 'services/auth';
import { API_ENDPOINT, API_TIMEOUT } from 'settings';

export function get<T = any>(url: string, params?: any): Observable<T> {
  return request('GET', url, params);
}

export function post<T = any>(url: string, body: any): Observable<T> {
  return request('POST', url, cleanBody(body));
}

export function del<T = any>(url: string, params?: any): Observable<T> {
  return request('DELETE', url, params);
}

function request<T>(method: string, url: string, data: any = null): Observable<T> {
  return Observable.of(true)
    .switchMap(() => {
      return Observable.fromPromise(axios.request({
        baseURL: API_ENDPOINT,
        url,
        method,
        timeout: API_TIMEOUT,
        headers: { 'Content-type': 'application/json' },
        params: method === 'GET' ? data : null,
        data: method === 'POST' ? data : null
      }));
    })
    .switchMap(res => checkNewToken(res))
    .map(response => dateFormatter.parseObj(response.data))
    .catch(err => {
      return err.message === 'no-internet' ?
        Observable.throw(err) :
        Observable.throw(new ApiError(err.config, err.response, err));
    });
}

function checkNewToken(response: AxiosResponse): Observable<AxiosResponse> {
  const accessToken = response.headers['x-token'];

  if (!accessToken) {
    return Observable.of(response);
  }

  return authService
    .setAccessToken(accessToken)
    .map(() => response);
}

function cleanBody(body: any): any {
  if (Array.isArray(body)) {
    return body.map(b => cleanBody(b));
  }

  if (body && typeof body === 'object' && !(body instanceof Date)) {
    return Object.keys(body).reduce((acc, key) => {
      const value = cleanBody(body[key]);

      if (value !== undefined && value !== null) {
        acc[key] = value;
      }

      return acc;
    }, {});
  }

  return body;
}