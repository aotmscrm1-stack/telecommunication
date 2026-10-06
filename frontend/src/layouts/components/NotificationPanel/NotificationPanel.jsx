import React from 'react';

export function NotificationPanel({ notifications = [], onClose }) {
  return (
    <div className="w-80 bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-2xl">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <h3 className="text-sm font-semibold text-white">Notifications</h3>
        {onClose && <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>}
      </div>
      <div className="py-4 text-center text-xs text-slate-500">
        {notifications.length === 0 ? 'No new notifications' : `${notifications.length} notifications`}
      </div>
    </div>
  );
}

export default NotificationPanel;
