import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

const activeIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const unreachableIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function timeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

export default function DeviceMarker({ location, isUnreachable }) {
  const icon = isUnreachable ? unreachableIcon : activeIcon;

  return (
    <Marker position={[location.latitude, location.longitude]} icon={icon}>
      <Popup>
        <div className="marker-popup">
          <strong>{location.device_id}</strong>
          <div>Lat: {location.latitude.toFixed(5)}</div>
          <div>Lng: {location.longitude.toFixed(5)}</div>
          <div>Accuracy: {location.accuracy}m</div>
          <div>Updated: {timeAgo(location.timestamp)}</div>
        </div>
      </Popup>
    </Marker>
  );
}
