export const VIDEO_WATCH_THRESHOLDS = {
  completeRatio: 0.9,
  maxReportedSecondsPerRequest: 7200,
} as const;

export const VIDEO_WATCH_EVENTS = {
  pause: 'pause',
  leave: 'leave',
  ended: 'ended',
} as const;
