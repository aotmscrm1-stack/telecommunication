/**
 * Department-specific input validators for Daily Activity reports.
 */

function validateDailyActivityPayload(payload, isSubmitting = false) {
  const errors = [];
  const { activityDate, department, metrics, outcomes, departmentData } = payload || {};

  // 1. Date validation: Strict YYYY-MM-DD and real calendar date check
  if (!activityDate || typeof activityDate !== 'string') {
    errors.push('Activity date is required.');
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(activityDate.trim())) {
    errors.push('Activity date must be in YYYY-MM-DD format.');
  } else {
    const [yStr, mStr, dStr] = activityDate.trim().split('-');
    const year = parseInt(yStr, 10);
    const month = parseInt(mStr, 10);
    const day = parseInt(dStr, 10);
    const actDate = new Date(year, month - 1, day);
    
    // Verify it is a valid calendar date (handles leap years, month length, out-of-range days)
    if (
      actDate.getFullYear() !== year ||
      actDate.getMonth() !== month - 1 ||
      actDate.getDate() !== day
    ) {
      errors.push('Activity date must be a valid calendar date.');
    } else {
      // Disallow dates more than 1 day in the future (accounting for organization timezone)
      const now = new Date();
      const maxFuture = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 59, 59);
      if (actDate > maxFuture) {
        errors.push('Daily activity cannot be logged for future dates.');
      }
    }
  }

  const deptNormalized = String(department || '').toLowerCase().trim();

  // 2. Department-specific validation
  if (deptNormalized.includes('telecall') || deptNormalized.includes('caller')) {
    if (metrics) {
      const {
        callsAttempted = 0,
        connectedCalls = 0,
        unansweredCalls = 0,
        interestedLeads = 0,
        followUpsScheduled = 0,
        conversions = 0,
      } = metrics;

      const attempted = Number(callsAttempted);
      const connected = Number(connectedCalls);
      const unanswered = Number(unansweredCalls);
      const interested = Number(interestedLeads);
      const followUps = Number(followUpsScheduled);
      const conv = Number(conversions);

      if (isNaN(attempted) || attempted < 0 || !Number.isInteger(attempted)) {
        errors.push('Calls attempted must be a non-negative integer.');
      }
      if (isNaN(connected) || connected < 0 || !Number.isInteger(connected)) {
        errors.push('Connected calls must be a non-negative integer.');
      }
      if (isNaN(unanswered) || unanswered < 0 || !Number.isInteger(unanswered)) {
        errors.push('Unanswered calls must be a non-negative integer.');
      }
      if (isNaN(interested) || interested < 0 || !Number.isInteger(interested)) {
        errors.push('Interested leads must be a non-negative integer.');
      }
      if (isNaN(followUps) || followUps < 0 || !Number.isInteger(followUps)) {
        errors.push('Follow-ups scheduled must be a non-negative integer.');
      }
      if (isNaN(conv) || conv < 0 || !Number.isInteger(conv)) {
        errors.push('Conversions must be a non-negative integer.');
      }

      // Logical integrity check: Connected calls cannot exceed calls attempted
      if (!isNaN(attempted) && !isNaN(connected) && connected > attempted) {
        errors.push(`Connected calls (${connected}) cannot exceed total calls attempted (${attempted}).`);
      }
      // Logical check: Interested leads cannot exceed connected calls
      if (!isNaN(connected) && !isNaN(interested) && interested > connected) {
        errors.push(`Interested leads (${interested}) cannot exceed connected calls (${connected}).`);
      }
    }

    // Outcomes validation
    if (Array.isArray(outcomes)) {
      outcomes.forEach((item, idx) => {
        if (!item || typeof item !== 'object') return;
        if (item.category === 'Follow-up Required') {
          if (!item.followUpAt) {
            errors.push(`Outcome #${idx + 1}: Follow-up date/time is required when category is 'Follow-up Required'.`);
          } else {
            const fDate = new Date(item.followUpAt);
            if (isNaN(fDate.getTime())) {
              errors.push(`Outcome #${idx + 1}: Follow-up date/time is invalid.`);
            }
          }
        }
      });
    }

    if (isSubmitting && (!metrics || Number(metrics.callsAttempted || 0) === 0)) {
      // If submitting with 0 calls, require remarks explaining reason
      if (!payload.remarks || payload.remarks.trim().length < 5) {
        errors.push('Please provide remarks explaining why 0 calls were logged for this date.');
      }
    }
  } else if (deptNormalized.includes('dev')) {
    const data = departmentData || {};
    // Automatically default status to 'In Progress' if not specified
    if (!data.status || String(data.status).trim().length === 0) {
      data.status = 'In Progress';
    }
    if (isSubmitting) {
      if (!data.projectName || data.projectName.trim().length === 0) {
        errors.push('Project / Module name is required.');
      }
      if (!data.workCompleted || data.workCompleted.trim().length === 0) {
        errors.push('Work completed details are required.');
      }
      if (!data.status) {
        errors.push('Work status (In Progress, Completed, Blocked) is required.');
      }
    }
    if (data.prLink && typeof data.prLink === 'string' && data.prLink.trim().length > 0) {
      if (!/^https?:\/\//i.test(data.prLink.trim())) {
        errors.push('Git branch / PR link must start with http:// or https://');
      }
    }
  } else if (deptNormalized.includes('manage')) {
    const data = departmentData || {};
    if (isSubmitting) {
      if (!data.keyActivities || data.keyActivities.trim().length === 0) {
        errors.push('Key activities / meetings details are required.');
      }
    }
  } else if (deptNormalized.includes('train')) {
    const data = departmentData || {};
    if (isSubmitting) {
      if (!data.courseBatch || data.courseBatch.trim().length === 0) {
        errors.push('Course / Batch name is required.');
      }
      if (!data.sessionTopic || data.sessionTopic.trim().length === 0) {
        errors.push('Session topic is required.');
      }
      if (data.attendanceCount !== undefined && data.attendanceCount !== null) {
        const att = Number(data.attendanceCount);
        if (isNaN(att) || att < 0) {
          errors.push('Student attendance count must be a non-negative number.');
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

module.exports = {
  validateDailyActivityPayload,
};
