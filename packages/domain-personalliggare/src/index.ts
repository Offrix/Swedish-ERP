export interface AttendanceEventRef {
  readonly attendanceEventId: string;
  readonly siteId: string;
  readonly workerIdentity: string;
  readonly eventType: "check_in" | "check_out" | "correction";
  readonly recordedAt: string;
}

