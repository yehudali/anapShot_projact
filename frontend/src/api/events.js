import client from './client';

export async function getEvents(status) {
  const params = status ? { status } : {};
  const { data } = await client.get('/events', { params });
  return data;
}

export async function getEvent(eventId) {
  const { data } = await client.get(`/events/${eventId}`);
  return data;
}

export async function createEvent(name, description) {
  const { data } = await client.post('/events', { name, description });
  return data;
}

export async function closeEvent(eventId) {
  const { data } = await client.put(`/events/${eventId}/close`);
  return data;
}

export async function getEventLocations(eventId) {
  const { data } = await client.get(`/events/${eventId}/locations`);
  return data;
}

export async function getEventHistory(eventId, page = 1, limit = 50) {
  const { data } = await client.get(`/events/${eventId}/history`, {
    params: { page, limit },
  });
  return data;
}
