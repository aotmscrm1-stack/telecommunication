export { default as DailyActivitySchedule } from './DailyActivitySchedule';
export { default as AllEmployeeActivities } from './AllEmployeeActivities';
export { default as MyActivitySchedule } from './MyActivitySchedule';
export { default as ActivityScheduleDetailModal } from './ActivityScheduleDetailModal';
export { default as ActivityScheduleFormModal } from './ActivityScheduleFormModal';
export { default as StagingReviewModal } from './StagingReviewModal';
export { default as AuditHistoryDrawer } from './AuditHistoryDrawer';

export default function DailyActivityScheduleModule() {
  const Component = require('./DailyActivitySchedule').default;
  return <Component />;
}

