import { timeAgo } from '../utils/time';

export default function Sidebar({
  eventName,
  locations,
  connectionStatus,
  eventStatus,
  isLoading,
  onDeviceClick,
  onCloseEvent,
  isAdmin,
}) {
  const statusColor = {
    connected: '#22c55e',
    connecting: '#f59e0b',
    disconnected: '#ef4444',
  };

  const statusLabel = {
    connected: 'מחובר',
    connecting: 'מתחבר...',
    disconnected: 'מנותק',
  };

  const activeCount = locations.filter((l) => l.state !== 'unreachable').length;
  const unreachableCount = locations.filter((l) => l.state === 'unreachable').length;

  // Sort: unreachable at bottom
  const sorted = [...locations].sort((a, b) => {
    if (a.state === 'unreachable' && b.state !== 'unreachable') return 1;
    if (a.state !== 'unreachable' && b.state === 'unreachable') return -1;
    return 0;
  });

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        {eventName && <div className="sidebar-event-name">{eventName}</div>}
        <div className="connection-status">
          <span className="status-dot" style={{ backgroundColor: statusColor[connectionStatus] }} />
          {statusLabel[connectionStatus]}
        </div>
        {!isLoading && locations.length > 0 && (
          <div className="sidebar-stats">
            <span className="stat-active">{activeCount} פעיל{activeCount !== 1 ? 'ים' : ''}</span>
            {unreachableCount > 0 && (
              <span className="stat-unreachable">{unreachableCount} לא זמין{unreachableCount !== 1 ? 'ים' : ''}</span>
            )}
          </div>
        )}
      </div>

      {eventStatus === 'closed' && (
        <div className="sidebar-notice">האירוע נסגר</div>
      )}

      <div className="sidebar-list">
        {isLoading ? (
          <div className="sidebar-empty">
            <span className="spinner" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="sidebar-empty">
            {eventStatus === 'closed' ? 'האירוע הסתיים' : 'ממתין לדיווח מכשירים...'}
          </div>
        ) : (
          sorted.map((loc) => (
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
                <span>{loc.accuracy != null ? `±${Math.round(loc.accuracy)}m` : ''}</span>
                <span>{timeAgo(loc.timestamp)}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {isAdmin && eventStatus === 'active' && (
        <div className="sidebar-footer">
          <button className="btn btn-danger btn-full" onClick={onCloseEvent}>
            סגור אירוע
          </button>
        </div>
      )}
    </div>
  );
}
