import { memo } from 'react';
import { PhoneCall, PhoneIncoming, PhoneOff, Clock, Activity, CheckCircle2 } from 'lucide-react';

function formatDuration(totalSeconds) {
  if (!totalSeconds || isNaN(totalSeconds) || totalSeconds <= 0) return '0s';
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = Math.floor(totalSeconds % 60);

  if (hrs > 0) {
    return `${hrs}h ${mins}m ${secs}s`;
  }
  if (mins > 0) {
    return `${mins}m ${secs}s`;
  }
  return `${secs}s`;
}

const CallAnalyticsCards = memo(function CallAnalyticsCards({ summary, loading }) {
  const cards = [
    {
      title: 'Total Calls',
      value: summary?.totalCalls ?? 0,
      subtext: summary?.hasRecordingCount ? `${summary.hasRecordingCount} with audio` : 'All logged calls',
      icon: PhoneCall,
      color: '#1a73e8',
      bgColor: '#e8f0fe',
      borderColor: '#c2e7ff'
    },
    {
      title: 'Connected Calls',
      value: summary?.completedCalls ?? 0,
      subtext: summary?.totalCalls ? `${summary.answerRate || '0%'} answer rate` : 'Answered calls',
      icon: CheckCircle2,
      color: '#16a34a',
      bgColor: '#f0fdf4',
      borderColor: '#bbf7d0'
    },
    {
      title: 'Missed & Unanswered',
      value: summary?.missedCalls ?? 0,
      subtext: summary?.failedCalls ? `${summary.failedCalls} failed attempts` : 'No answer / busy',
      icon: PhoneOff,
      color: '#ea580c',
      bgColor: '#fff7ed',
      borderColor: '#fed7aa'
    },
    {
      title: 'Total Talk Time',
      value: formatDuration(summary?.totalDurationSeconds),
      subtext: 'Cumulative call duration',
      icon: Clock,
      color: '#7c3aed',
      bgColor: '#f5f3ff',
      borderColor: '#ddd6fe'
    },
    {
      title: 'Avg Call Duration',
      value: formatDuration(summary?.avgDurationSeconds),
      subtext: 'Per connected call',
      icon: Activity,
      color: '#0891b2',
      bgColor: '#ecfeff',
      borderColor: '#a5f3fc'
    },
    {
      title: 'Answer Rate',
      value: summary?.answerRate || '0.0%',
      subtext: 'Completed vs total calls',
      icon: PhoneIncoming,
      color: '#2563eb',
      bgColor: '#eff6ff',
      borderColor: '#bfdbfe'
    }
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
      gap: '14px',
      marginBottom: '20px'
    }}>
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.title}
            style={{
              background: '#ffffff',
              padding: '16px 18px',
              borderRadius: '14px',
              border: `1px solid ${card.borderColor || '#e2e8f0'}`,
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'transform 0.15s, box-shadow 0.15s',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{
                fontSize: '11px',
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                color: '#64748b'
              }}>
                {card.title}
              </span>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: card.bgColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: card.color
              }}>
                <Icon style={{ width: '16px', height: '16px' }} />
              </div>
            </div>

            <div>
              <div style={{
                fontSize: '22px',
                fontWeight: 600,
                color: '#0f172a',
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '-0.02em',
                lineHeight: 1.2
              }}>
                {loading ? '—' : card.value}
              </div>
              <div style={{
                fontSize: '11px',
                color: '#64748b',
                marginTop: '4px',
                fontWeight: 500
              }}>
                {card.subtext}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
});

export default CallAnalyticsCards;
