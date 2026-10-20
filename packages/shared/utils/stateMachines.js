// packages/shared/utils/stateMachines.js
// Advanced Tech Club (ATC) — Student Lifecycle & Event Attendance State Machines
// Provides formal state validation, transition guards, and permission policies.

/**
 * ============================================================================
 * 1. STUDENT LIFECYCLE STATE MACHINE
 * ============================================================================
 */
export const STUDENT_STATES = Object.freeze({
  GUEST: 'GUEST',
  APPLICANT_PENDING: 'APPLICANT_PENDING',
  APPLICANT_REJECTED: 'APPLICANT_REJECTED',
  VERIFIED_MEMBER: 'VERIFIED_MEMBER',
  ADMIN: 'ADMIN',
  SUSPENDED: 'SUSPENDED'
});

export const STUDENT_TRANSITIONS = Object.freeze({
  [STUDENT_STATES.GUEST]: [
    STUDENT_STATES.APPLICANT_PENDING,
    STUDENT_STATES.VERIFIED_MEMBER, // Auto-promoted first user or dev demo
    STUDENT_STATES.ADMIN
  ],
  [STUDENT_STATES.APPLICANT_PENDING]: [
    STUDENT_STATES.VERIFIED_MEMBER, // Admin approved
    STUDENT_STATES.APPLICANT_REJECTED, // Admin rejected
    STUDENT_STATES.SUSPENDED
  ],
  [STUDENT_STATES.APPLICANT_REJECTED]: [
    STUDENT_STATES.APPLICANT_PENDING // Reapplication
  ],
  [STUDENT_STATES.VERIFIED_MEMBER]: [
    STUDENT_STATES.ADMIN, // Promoted
    STUDENT_STATES.SUSPENDED // Disciplinary or hiatus
  ],
  [STUDENT_STATES.ADMIN]: [
    STUDENT_STATES.VERIFIED_MEMBER // Demoted
  ],
  [STUDENT_STATES.SUSPENDED]: [
    STUDENT_STATES.VERIFIED_MEMBER // Reinstated
  ]
});

/**
 * Derives student lifecycle state from user object
 */
export function getStudentState(user) {
  if (!user || !user.id) return STUDENT_STATES.GUEST;
  if (user.role === 'admin' || user.role === 'super_admin') return STUDENT_STATES.ADMIN;
  if (user.status === 'suspended' || user.is_suspended) return STUDENT_STATES.SUSPENDED;
  if (user.is_verified || user.verification_status === 'verified') return STUDENT_STATES.VERIFIED_MEMBER;
  if (user.verification_status === 'rejected') return STUDENT_STATES.APPLICANT_REJECTED;
  if (user.verification_status === 'pending' || !user.is_verified) return STUDENT_STATES.APPLICANT_PENDING;
  return STUDENT_STATES.APPLICANT_PENDING;
}

/**
 * Validates student state transition
 */
export function canTransitionStudent(fromState, toState) {
  const allowed = STUDENT_TRANSITIONS[fromState] || [];
  return allowed.includes(toState);
}

/**
 * State-based permission guards
 */
export function canStudentCheckIn(user) {
  const state = getStudentState(user);
  switch (state) {
    case STUDENT_STATES.ADMIN:
    case STUDENT_STATES.VERIFIED_MEMBER:
      return { allowed: true, state };
    case STUDENT_STATES.APPLICANT_PENDING:
      return {
        allowed: false,
        state,
        code: 'PENDING_VERIFICATION',
        message: 'Your student application is currently under review. Event check-in requires verified membership.'
      };
    case STUDENT_STATES.APPLICANT_REJECTED:
      return {
        allowed: false,
        state,
        code: 'APPLICATION_REJECTED',
        message: 'Your membership application was not approved. Please re-apply to access club workshops.'
      };
    case STUDENT_STATES.SUSPENDED:
      return {
        allowed: false,
        state,
        code: 'ACCOUNT_SUSPENDED',
        message: 'Your club access is temporarily suspended. Please contact club administration.'
      };
    case STUDENT_STATES.GUEST:
    default:
      return {
        allowed: false,
        state: STUDENT_STATES.GUEST,
        code: 'UNAUTHENTICATED',
        message: 'Please sign in to your ATC account to check in to this workshop.'
      };
  }
}

/**
 * ============================================================================
 * 2. EVENT ATTENDANCE STATE MACHINE
 * ============================================================================
 */
export const ATTENDANCE_STATES = Object.freeze({
  NOT_REGISTERED: 'NOT_REGISTERED',
  REGISTERED: 'REGISTERED',
  WAITLISTED: 'WAITLISTED',
  CHECKED_IN: 'CHECKED_IN',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  NO_SHOW: 'NO_SHOW'
});

export const ATTENDANCE_TRANSITIONS = Object.freeze({
  [ATTENDANCE_STATES.NOT_REGISTERED]: [
    ATTENDANCE_STATES.REGISTERED,
    ATTENDANCE_STATES.WAITLISTED,
    ATTENDANCE_STATES.CHECKED_IN // Walk-in checkin
  ],
  [ATTENDANCE_STATES.REGISTERED]: [
    ATTENDANCE_STATES.CHECKED_IN,
    ATTENDANCE_STATES.CANCELLED,
    ATTENDANCE_STATES.NO_SHOW
  ],
  [ATTENDANCE_STATES.WAITLISTED]: [
    ATTENDANCE_STATES.REGISTERED, // Promoted from waitlist
    ATTENDANCE_STATES.CANCELLED
  ],
  [ATTENDANCE_STATES.CHECKED_IN]: [
    ATTENDANCE_STATES.COMPLETED
  ],
  [ATTENDANCE_STATES.CANCELLED]: [
    ATTENDANCE_STATES.REGISTERED, // Re-registered
    ATTENDANCE_STATES.CHECKED_IN // Walk-in reinstatement
  ],
  [ATTENDANCE_STATES.NO_SHOW]: [],
  [ATTENDANCE_STATES.COMPLETED]: []
});

/**
 * Normalizes registration status string into ATTENDANCE_STATES
 */
export function normalizeAttendanceState(status) {
  if (!status) return ATTENDANCE_STATES.NOT_REGISTERED;
  const s = String(status).trim().toUpperCase();
  if (s === 'ATTENDED' || s === 'CHECKED_IN' || s === 'CHECKEDIN') return ATTENDANCE_STATES.CHECKED_IN;
  if (s === 'COMPLETED') return ATTENDANCE_STATES.COMPLETED;
  if (s === 'REGISTERED' || s === 'CONFIRMED') return ATTENDANCE_STATES.REGISTERED;
  if (s === 'WAITLISTED' || s === 'WAITLIST') return ATTENDANCE_STATES.WAITLISTED;
  if (s === 'CANCELLED' || s === 'CANCELED') return ATTENDANCE_STATES.CANCELLED;
  if (s === 'NO_SHOW' || s === 'NOSHOW') return ATTENDANCE_STATES.NO_SHOW;
  return ATTENDANCE_STATES.NOT_REGISTERED;
}

/**
 * Guard: Check if a student can check in based on current attendance state
 */
export function validateAttendanceCheckInTransition(currentRawStatus) {
  const currentState = normalizeAttendanceState(currentRawStatus);

  // Idempotency Guard: Already checked in or completed
  if (currentState === ATTENDANCE_STATES.CHECKED_IN || currentState === ATTENDANCE_STATES.COMPLETED) {
    return {
      allowed: false,
      isAlreadyCheckedIn: true,
      currentState,
      code: 'ALREADY_CHECKED_IN',
      message: 'Student is already checked in to this workshop! 🎟️'
    };
  }

  // Allowed transitions to CHECKED_IN
  const allowedNext = ATTENDANCE_TRANSITIONS[currentState] || [];
  if (allowedNext.includes(ATTENDANCE_STATES.CHECKED_IN)) {
    return {
      allowed: true,
      isAlreadyCheckedIn: false,
      currentState,
      nextState: ATTENDANCE_STATES.CHECKED_IN,
      isWalkIn: currentState === ATTENDANCE_STATES.NOT_REGISTERED
    };
  }

  return {
    allowed: false,
    isAlreadyCheckedIn: false,
    currentState,
    code: 'INVALID_TRANSITION',
    message: `Cannot check in from status: ${currentState}`
  };
}
