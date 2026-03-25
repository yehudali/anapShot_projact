import client from './client';

export async function getDevices(state) {
  const params = state ? { state } : {};
  const { data } = await client.get('/devices', { params });
  return data;
}

export async function getDevice(deviceId) {
  const { data } = await client.get(`/devices/${deviceId}`);
  return data;
}

export async function createDevice(name, userId) {
  const { data } = await client.post('/devices', { name, user_id: userId });
  return data;
}

export async function updateDevice(deviceId, updates) {
  const { data } = await client.put(`/devices/${deviceId}`, updates);
  return data;
}

export async function deleteDevice(deviceId) {
  const { data } = await client.delete(`/devices/${deviceId}`);
  return data;
}
