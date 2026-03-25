import client from './client';

export async function getUsers() {
  const { data } = await client.get('/users');
  return data;
}

export async function getUser(userId) {
  const { data } = await client.get(`/users/${userId}`);
  return data;
}

export async function createUser(username, password, role) {
  const { data } = await client.post('/users', { username, password, role });
  return data;
}
