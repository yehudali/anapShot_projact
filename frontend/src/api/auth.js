import client from './client';

export async function login(username, password) {
  const { data } = await client.post('/auth/login', { username, password });
  localStorage.setItem('token', data.data.token);
  localStorage.setItem('role', data.data.role);
  return data;
}

export function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('role');
}

export function getToken() {
  return localStorage.getItem('token');
}

export function getRole() {
  return localStorage.getItem('role');
}

export function isLoggedIn() {
  return !!localStorage.getItem('token');
}
