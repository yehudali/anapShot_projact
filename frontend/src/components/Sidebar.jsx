function timeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

export default function Sidebar({ locations, connectionStatus, eventStatus, onDeviceClick, onCloseEvent, isAdmin }) {
  const statusColor = {
    connected: '#22c55e',
    connecting: '#f59e0b',
    disconnected: '#ef4444',
  };

  const statusLabel = {
    connected: 'Connected',
    connecting: 'Connecting...',
    disconnected: 'Disconnected',
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h3>Live Devices</h3>
        <div className="connection-status">
          <span
            className="status-dot"
            style={{ backgroundColor: statusColor[connectionStatus] }}
          />
          {statusLabel[connectionStatus]}
        </div>
      </div>

      {eventStatus === 'closed' && (
        <div className="sidebar-notice">Event is closed</div>
      )}

      <div className="sidebar-list">
        {locations.length === 0 ? (
          <div className="sidebar-empty">No devices reporting</div>
        ) : (
          locations.map((loc) => (
            <div
              key={loc.device_id}
              className={`sidebar-item${loc.state === 'unreachable' ? ' sidebar-item--unreachable' : ''}`}
              onClick={() => onDeviceClick(loc)}
            >
              <div className="sidebar-item-name">
                {loc.device_name || loc.device_id}
                {loc.state === 'unreachable' && <span className="unreachable-badge">!</span>}
              </div>
              <div className="sidebar-item-meta">
                <span>Accuracy: {loc.accuracy}m</span>
                <span>{timeAgo(loc.timestamp)}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {isAdmin && eventStatus === 'active' && (
        <div className="sidebar-footer">
          <button className="btn btn-danger btn-full" onClick={onCloseEvent}>
            Close Event
          </button>
        </div>
      )}
    </div>
  );
}
