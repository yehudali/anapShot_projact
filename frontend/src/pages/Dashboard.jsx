import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import DeviceMarker from '../components/DeviceMarker';
import Sidebar from '../components/Sidebar';
import useEventStream from '../hooks/useEventStream';
import { closeEvent } from '../api/events';
import { useAuth } from '../context/AuthContext';
import 'leaflet/dist/leaflet.css';

function FlyToDevice({ position }) {
  const map = useMap();
  if (position) {
    map.flyTo(position, 15, { duration: 1 });
  }
  return null;
}

export default function Dashboard() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { locations, eventStatus, connectionStatus } = useEventStream(eventId);
  const [flyTo, setFlyTo] = useState(null);
  const mapRef = useRef(null);

  const handleDeviceClick = (loc) => {
    setFlyTo([loc.latitude, loc.longitude]);
    // Reset flyTo so clicking same device works again
    setTimeout(() => setFlyTo(null), 100);
  };

  const handleCloseEvent = async () => {
    if (!window.confirm('Are you sure you want to close this event?')) return;
    try {
      await closeEvent(eventId);
      navigate('/events');
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to close event');
    }
  };

  return (
    <div className="dashboard">
      <Sidebar
        locations={locations}
        connectionStatus={connectionStatus}
        eventStatus={eventStatus}
        onDeviceClick={handleDeviceClick}
        onCloseEvent={handleCloseEvent}
        isAdmin={isAdmin}
      />
      <div className="map-wrapper">
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
            <DeviceMarker key={loc.device_id} location={loc} isUnreachable={loc.state === 'unreachable'} />
          ))}
          <FlyToDevice position={flyTo} />
        </MapContainer>
      </div>
    </div>
  );
}
