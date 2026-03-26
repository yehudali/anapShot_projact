import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import DeviceMarker from '../components/DeviceMarker';
import Sidebar from '../components/Sidebar';
import useEventStream from '../hooks/useEventStream';
import { closeEvent, getEvent } from '../api/events';
import { useAuth } from '../context/AuthContext';
import 'leaflet/dist/leaflet.css';

function FlyToDevice({ position }) {
  const map = useMap();
  if (position) map.flyTo(position, 15, { duration: 1 });
  return null;
}

function FitBounds({ locations }) {
  const map = useMap();
  const fitted = useRef(false);

  useEffect(() => {
    if (locations.length > 0 && !fitted.current) {
      const bounds = locations.map((l) => [l.latitude, l.longitude]);
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
      fitted.current = true;
    }
  }, [locations, map]);

  return null;
}

export default function Dashboard() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { locations, eventStatus, connectionStatus, isLoading } = useEventStream(eventId);
  const [flyTo, setFlyTo] = useState(null);
  const [eventName, setEventName] = useState('');
  const mapRef = useRef(null);

  useEffect(() => {
    getEvent(eventId)
      .then((res) => setEventName(res?.data?.name || ''))
      .catch(() => {});
  }, [eventId]);

  const handleDeviceClick = (loc) => {
    setFlyTo([loc.latitude, loc.longitude]);
    setTimeout(() => setFlyTo(null), 100);
  };

  const handleCloseEvent = async () => {
    if (!window.confirm(`לסגור את האירוע "${eventName}"?`)) return;
    try {
      await closeEvent(eventId);
      navigate('/events');
    } catch (err) {
      alert(err.response?.data?.detail || 'שגיאה בסגירת האירוע');
    }
  };

  return (
    <div className="dashboard">
      <Sidebar
        eventName={eventName}
        locations={locations}
        connectionStatus={connectionStatus}
        eventStatus={eventStatus}
        isLoading={isLoading}
        onDeviceClick={handleDeviceClick}
        onCloseEvent={handleCloseEvent}
        isAdmin={isAdmin}
      />
      <div className="map-wrapper">
        {isLoading && (
          <div className="map-loading-overlay">
            <span className="spinner" />
            <span>מתחבר לשידור חי...</span>
          </div>
        )}
        <MapContainer
          center={[31.5, 34.75]}
          zoom={8}
          style={{ height: '100%', width: '100%' }}
          ref={mapRef}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {locations.map((loc) => (
            <DeviceMarker
              key={loc.device_id}
              location={loc}
              isUnreachable={loc.state === 'unreachable'}
            />
          ))}
          <FlyToDevice position={flyTo} />
          <FitBounds locations={locations} />
        </MapContainer>
      </div>
    </div>
  );
}
