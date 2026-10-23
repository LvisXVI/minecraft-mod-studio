import { demoApi, demoFetch } from './demo-api.js';
export async function api(path, options = {}) { return demoApi(path, options); }
export function jsonBody(value) { return JSON.stringify(value); }
export async function apiFetch(path, options = {}) { return demoFetch(path, options); }
