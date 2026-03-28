import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { timeAgo } from '../utils/time';

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

export default function DeviceMarker({ location, isUnreachable }) {
  const icon = isUnreachable ? unreachableIcon : activeIcon;
  const displayName = location.device_name || location.device_id;

  return (
    <Marker position={[location.latitude, location.longitude]} icon={icon}>
      <Popup>
        <div className="marker-popup">
          <strong>{displayName}</strong>
          {isUnreachable && (
            <div style={{ color: '#ef4444', fontSize: '0.78rem', marginBottom: 4 }}>
              לא זמין
            </div>
          )}
          <div>Lat: {location.latitude.toFixed(5)}</div>
          <div>Lng: {location.longitude.toFixed(5)}</div>
          {location.accuracy != null && <div>Accuracy: ±{Math.round(location.accuracy)}m</div>}
          <div style={{ color: '#94a3b8', marginTop: 4 }}>{timeAgo(location.timestamp)}</div>
        </div>
      </Popup>
    </Marker>
  );
}
