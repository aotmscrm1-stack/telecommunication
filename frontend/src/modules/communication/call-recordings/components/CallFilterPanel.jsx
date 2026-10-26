import { useState, useEffect } from 'react';
import { 
  Filter, 
  RotateCcw, 
  ChevronDown, 
  ChevronUp, 
  X, 
  Calendar, 
  User, 
  Clock, 
  PhoneIncoming, 
  Radio, 
  FileAudio, 
  Layers, 
  Check 
} from 'lucide-react';
import { usersAPI } from '../../../../services/api';

export default function CallFilterPanel({
  filters,
  onChangeFilters,
  onResetFilters,
  totalMatching = 0
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [usersList, setUsersList] = useState([]);

  useEffect(() => {
    let isMounted = true;
    usersAPI.getAll()
      .then(res => {
        if (!isMounted) return;
        const list = res.data?.users || res.data || [];
        setUsersList(Array.isArray(list) ? list : []);
      })
      .catch(() => {});
    return () => { isMounted = false; };
  }, []);

  // Quick Date Preset Handlers
  const handleDatePreset = (preset) => {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    if (preset === 'today') {
      onChangeFilters({ ...filters, datePreset: 'today', date: todayStr, from: '', to: '', page: 1 });
    } else if (preset === 'yesterday') {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      const yStr = y.toISOString().slice(0, 10);
      onChangeFilters({ ...filters, datePreset: 'yesterday', date: yStr, from: '', to: '', page: 1 });
    } else if (preset === '7days') {
      const d = new Date(today);
      d.setDate(d.getDate() - 7);
      onChangeFilters({ ...filters, datePreset: '7days', date: '', from: d.toISOString().slice(0, 10), to: todayStr, page: 1 });
    } else if (preset === '30days') {
      const d = new Date(today);
      d.setDate(d.getDate() - 30);
      onChangeFilters({ ...filters, datePreset: '30days', date: '', from: d.toISOString().slice(0, 10), to: todayStr, page: 1 });
    } else if (preset === 'thisMonth') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
      onChangeFilters({ ...filters, datePreset: 'thisMonth', date: '', from: start, to: todayStr, page: 1 });
    } else if (preset === 'all') {
      onChangeFilters({ ...filters, datePreset: 'all', date: '', from: '', to: '', page: 1 });
    }
  };

  // Determine active filter count for badge
  const activeChips = [];
  if (filters.datePreset && filters.datePreset !== 'all') {
    const labels = {
      today: 'Date: Today',
      yesterday: 'Date: Yesterday',
      '7days': 'Last 7 Days',
      '30days': 'Last 30 Days',
      thisMonth: 'This Month'
    };
    activeChips.push({
      key: 'datePreset',
      label: labels[filters.datePreset] || filters.datePreset,
      clear: () => onChangeFilters({ ...filters, datePreset: 'all', date: '', from: '', to: '', page: 1 })
    });
  } else if (filters.date) {
    activeChips.push({
      key: 'date',
      label: `Day: ${filters.date}`,
      clear: () => onChangeFilters({ ...filters, date: '', page: 1 })
    });
  } else if (filters.from || filters.to) {
    activeChips.push({
      key: 'range',
      label: `${filters.from || 'Start'} to ${filters.to || 'Now'}`,
      clear: () => onChangeFilters({ ...filters, from: '', to: '', page: 1 })
    });
  }

  if (filters.status && filters.status !== 'all') {
    activeChips.push({
      key: 'status',
      label: `Status: ${filters.status}`,
      clear: () => onChangeFilters({ ...filters, status: 'all', page: 1 })
    });
  }

  if (filters.userId && filters.userId !== 'all') {
    const matchedUser = usersList.find(u => (u._id === filters.userId || u.id === filters.userId));
    activeChips.push({
      key: 'userId',
      label: `Agent: ${matchedUser?.name || 'Selected'}`,
      clear: () => onChangeFilters({ ...filters, userId: 'all', page: 1 })
    });
  }

  if (filters.durationTier && filters.durationTier !== 'all') {
    const dLabels = { zero: '0 sec', short: '< 1 min', medium: '1–5 mins', long: '> 5 mins' };
    activeChips.push({
      key: 'durationTier',
      label: `Duration: ${dLabels[filters.durationTier] || filters.durationTier}`,
      clear: () => onChangeFilters({ ...filters, durationTier: 'all', page: 1 })
    });
  }

  if (filters.direction && filters.direction !== 'all') {
    activeChips.push({
      key: 'direction',
      label: `Direction: ${filters.direction}`,
      clear: () => onChangeFilters({ ...filters, direction: 'all', page: 1 })
    });
  }

  if (filters.fileAvailable && filters.fileAvailable !== 'all') {
    activeChips.push({
      key: 'fileAvailable',
      label: filters.fileAvailable === 'true' ? 'Audio Available' : 'Missing Audio',
      clear: () => onChangeFilters({ ...filters, fileAvailable: 'all', page: 1 })
    });
  }

  if (filters.linkType && filters.linkType !== 'all') {
    const linkLabels = { lead: 'Normal Leads', meta_lead: 'Meta Leads', campaign: 'Campaigns', unlinked: 'Unlinked', matched: 'Linked Only' };
    activeChips.push({
      key: 'linkType',
      label: `Category: ${linkLabels[filters.linkType] || filters.linkType}`,
      clear: () => onChangeFilters({ ...filters, linkType: 'all', page: 1 })
    });
  }

  return (
    <div style={{
      background: '#ffffff',
      borderRadius: '16px',
      border: '1px solid #e2e8f0',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      marginBottom: '20px',
      overflow: 'hidden'
    }}>
      {/* ── TOP ACCORDION BAR ── */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          background: isOpen ? '#f8fafc' : '#ffffff',
          transition: 'background 0.15s'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: '#e0f2fe',
            color: '#0284c7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Filter style={{ width: '16px', height: '16px' }} />
          </div>

          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Smart Filters</span>
              {activeChips.length > 0 && (
                <span style={{
                  fontSize: '11px',
                  fontWeight: 500,
                  background: '#1a73e8',
                  color: '#ffffff',
                  padding: '1px 8px',
                  borderRadius: '12px'
                }}>
                  {activeChips.length} active
                </span>
              )}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>
              Filter by date presets, status, agent, duration, and link category
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>
            {totalMatching} calls matching
          </span>

          {isOpen ? (
            <ChevronUp style={{ width: '18px', height: '18px', color: '#64748b' }} />
          ) : (
            <ChevronDown style={{ width: '18px', height: '18px', color: '#64748b' }} />
          )}
        </div>
      </div>

      {/* ── ACTIVE FILTER CHIPS (Visible even when accordion is collapsed) ── */}
      {activeChips.length > 0 && (
        <div style={{
          padding: '10px 18px',
          background: '#f8fafc',
          borderTop: '1px solid #f1f5f9',
          borderBottom: isOpen ? '1px solid #e2e8f0' : 'none',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.04em' }}>
            Active:
          </span>

          {activeChips.map((chip) => (
            <span
              key={chip.key}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '3px 8px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 600,
                background: '#ffffff',
                color: '#1a73e8',
                border: '1px solid #bfdbfe',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
              }}
            >
              {chip.label}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  chip.clear();
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center'
                }}
                title="Remove filter"
              >
                <X style={{ width: '12px', height: '12px' }} />
              </button>
            </span>
          ))}

          <button
            onClick={(e) => {
              e.stopPropagation();
              onResetFilters();
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#ef4444',
              fontSize: '11px',
              fontWeight: 500,
              cursor: 'pointer',
              marginLeft: 'auto',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <RotateCcw style={{ width: '12px', height: '12px' }} /> Clear All
          </button>
        </div>
      )}

      {/* ── EXPANDABLE FILTER CONTROLS ── */}
      {isOpen && (
        <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Row 1: Date Range Presets */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
              📅 Date Presets
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {[
                { id: 'today', label: 'Today' },
                { id: 'yesterday', label: 'Yesterday' },
                { id: '7days', label: 'Last 7 Days' },
                { id: 'thisMonth', label: 'This Month' },
                { id: '30days', label: 'Last 30 Days' },
                { id: 'all', label: 'All Time' }
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => handleDatePreset(p.id)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: filters.datePreset === p.id ? '1px solid #1a73e8' : '1px solid #cbd5e1',
                    background: filters.datePreset === p.id ? '#eff6ff' : '#ffffff',
                    color: filters.datePreset === p.id ? '#1a73e8' : '#334155',
                    transition: 'all 0.15s'
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Row 2: Custom Date Range */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: '#64748b', marginBottom: '4px' }}>
                From Date
              </label>
              <input
                type="date"
                value={filters.from || ''}
                onChange={e => onChangeFilters({ ...filters, datePreset: 'custom', date: '', from: e.target.value, page: 1 })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '12px',
                  outline: 'none',
                  background: '#ffffff'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: '#64748b', marginBottom: '4px' }}>
                To Date
              </label>
              <input
                type="date"
                value={filters.to || ''}
                onChange={e => onChangeFilters({ ...filters, datePreset: 'custom', date: '', to: e.target.value, page: 1 })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '12px',
                  outline: 'none',
                  background: '#ffffff'
                }}
              />
            </div>
          </div>

          {/* Row 3: Grid of Dropdown Selectors */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '14px'
          }}>
            {/* Call Status */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: '#64748b', marginBottom: '4px' }}>
                Call Status
              </label>
              <select
                value={filters.status || 'all'}
                onChange={e => onChangeFilters({ ...filters, status: e.target.value, page: 1 })}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '12px',
                  background: '#ffffff',
                  outline: 'none'
                }}
              >
                <option value="all">All Call Statuses</option>
                <option value="completed">Completed / Connected</option>
                <option value="missed">Missed / Unanswered</option>
                <option value="failed">Failed Attempt</option>
                <option value="busy">Busy</option>
                <option value="no_answer">No Answer</option>
              </select>
            </div>

            {/* Employee / Agent */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: '#64748b', marginBottom: '4px' }}>
                Employee / Agent
              </label>
              <select
                value={filters.userId || 'all'}
                onChange={e => onChangeFilters({ ...filters, userId: e.target.value, page: 1 })}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '12px',
                  background: '#ffffff',
                  outline: 'none'
                }}
              >
                <option value="all">All Agents</option>
                {usersList.map(u => (
                  <option key={u._id || u.id} value={u._id || u.id}>
                    {u.name} ({u.designation || u.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Duration Tier */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: '#64748b', marginBottom: '4px' }}>
                Call Duration
              </label>
              <select
                value={filters.durationTier || 'all'}
                onChange={e => onChangeFilters({ ...filters, durationTier: e.target.value, page: 1 })}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '12px',
                  background: '#ffffff',
                  outline: 'none'
                }}
              >
                <option value="all">Any Duration</option>
                <option value="zero">Zero Duration (0 sec)</option>
                <option value="short">Short (&lt; 1 min)</option>
                <option value="medium">Medium (1–5 mins)</option>
                <option value="long">Long (&gt; 5 mins)</option>
              </select>
            </div>

            {/* Link Category */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: '#64748b', marginBottom: '4px' }}>
                Link Category
              </label>
              <select
                value={filters.linkType || 'all'}
                onChange={e => onChangeFilters({ ...filters, linkType: e.target.value, page: 1 })}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '12px',
                  background: '#ffffff',
                  outline: 'none'
                }}
              >
                <option value="all">All Categories</option>
                <option value="matched">Linked Only (Any)</option>
                <option value="lead">Normal Leads</option>
                <option value="meta_lead">Meta Leads</option>
                <option value="campaign">Marketing Campaigns</option>
                <option value="unlinked">Unlinked Sessions</option>
              </select>
            </div>

            {/* Audio Recording */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: '#64748b', marginBottom: '4px' }}>
                Audio File
              </label>
              <select
                value={filters.fileAvailable || 'all'}
                onChange={e => onChangeFilters({ ...filters, fileAvailable: e.target.value, page: 1 })}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '12px',
                  background: '#ffffff',
                  outline: 'none'
                }}
              >
                <option value="all">All Records</option>
                <option value="true">Audio Available</option>
                <option value="false">Audio Missing / Lost</option>
              </select>
            </div>

            {/* Call Direction */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: '#64748b', marginBottom: '4px' }}>
                Call Direction
              </label>
              <select
                value={filters.direction || 'all'}
                onChange={e => onChangeFilters({ ...filters, direction: e.target.value, page: 1 })}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '12px',
                  background: '#ffffff',
                  outline: 'none'
                }}
              >
                <option value="all">All Directions</option>
                <option value="outbound">Outbound (Agent to Lead)</option>
                <option value="inbound">Inbound (Lead to Agent)</option>
              </select>
            </div>
          </div>

          {/* Action Row */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
            paddingTop: '12px',
            borderTop: '1px solid #f1f5f9'
          }}>
            <button
              onClick={onResetFilters}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                fontSize: '12px',
                fontWeight: 500,
                color: '#64748b',
                cursor: 'pointer'
              }}
            >
              Reset All
            </button>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                padding: '8px 18px',
                borderRadius: '8px',
                border: 'none',
                background: '#1a73e8',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              Done Filtering
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
