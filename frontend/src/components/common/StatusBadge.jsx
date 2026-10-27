const statusConfig = {
  'Fresh': { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  'Connected': { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  'Not Answered': { bg: 'bg-amber-50', text: 'text-amber-800', dot: 'bg-amber-500' },
  'not answered': { bg: 'bg-amber-50', text: 'text-amber-800', dot: 'bg-amber-500' },
  'Call Back': { bg: 'bg-sky-50', text: 'text-sky-700', dot: 'bg-sky-500' },
  'call back': { bg: 'bg-sky-50', text: 'text-sky-700', dot: 'bg-sky-500' },
  'Call Not Responding': { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' },
  'Call Back Later': { bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-500' },
  'Not interested': { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  'Interested': { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  'Follow Up': { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  'Demo Scheduled': { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500' },
  'Demo Done': { bg: 'bg-teal-50', text: 'text-teal-700', dot: 'bg-teal-500' },
  'Won': { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-600' },
  'Lost': { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
  'Positive': { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  'Negative': { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  'Agreed to Office visit\'s but no luck': { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  'Interested/Need time(After few months) waiting for parents approval': { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  'office visit\'s': { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  'Demo attended': { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  'Demo not attended-Call Back': { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  'time issues/Fee issues': { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  'Call back/We will Call': { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  'Not answering-call back/whats app text': { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  'Not interested/Time pass': { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  'WN-SO-ON': { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  'joined another institute/jobs': { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  'Blocked': { bg: 'bg-rose-100', text: 'text-rose-700', dot: 'bg-rose-500' },
};

// status: label text. color: optional hex from the configurable Lead Stage
// (Workspace Settings > Lead Stage). When provided and there's no built-in
import AutoScrollText from './AutoScrollText';

// status: label text. color: optional hex from the configurable Lead Stage
// (Workspace Settings > Lead Stage). When provided and there's no built-in
// Tailwind preset for that label, the badge renders using the custom color
// instead of falling back to plain gray.
export default function StatusBadge({ status, color, size = 'sm' }) {
  const preset = statusConfig[status];
  const sizeClass = size === 'sm' ? 'text-xs' : 'text-sm';

  if (!preset && color) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-semibold max-w-[170px] whitespace-nowrap overflow-hidden flex-shrink-0 ${sizeClass}`}
        style={{ background: `${color}22`, color }}
        title={status}
      >
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }}></span>
        <AutoScrollText text={status} maxWidth={130} />
      </span>
    );
  }

  const config = preset || { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-semibold max-w-[170px] whitespace-nowrap overflow-hidden flex-shrink-0 ${config.bg} ${config.text} ${sizeClass}`} title={status}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${config.dot}`}></span>
      <AutoScrollText text={status} maxWidth={130} />
    </span>
  );
}

export { statusConfig };