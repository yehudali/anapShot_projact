import { useState, useEffect, useRef, useCallback } from 'react';
import { getToken } from '../api/auth';

export default function useEventStream(eventId) {
  const [locations, setLocations] = useState([]);
  const [eventStatus, setEventStatus] = useState('active');
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);
  const eventStatusRef = useRef('active');

  const connect = useCallback(() => {
    if (!eventId) return;

    const token = getToken();
    if (!token) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const url = `${protocol}//${host}/ws/events/${eventId}?token=${token}`;

    setConnectionStatus('connecting');
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnectionStatus('connected');
    };

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        setLocations(data.locations || []);
        const status = data.status || 'active';
        setEventStatus(status);
        eventStatusRef.current = status;

        if (status === 'closed') {
          ws.close();
          setConnectionStatus('disconnected');
        }
      } catch {
        // ignore parse errors
      }
    };

    ws.onerror = () => {
      setConnectionStatus('disconnected');
    };

    ws.onclose = () => {
      setConnectionStatus('disconnected');
      wsRef.current = null;
      // Auto-reconnect after 3 seconds if event is still active
      if (eventStatusRef.current === 'active') {
        reconnectTimer.current = setTimeout(() => {
          connect();
        }, 3000);
      }
    };
  }, [eventId]);

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
      }
    };
  }, [connect]);

  return { locations, eventStatus, connectionStatus };
}
