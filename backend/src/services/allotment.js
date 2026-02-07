// ============================================================
// Allotment Service — Atomic Room Assignment Logic
// ============================================================
// Pure business logic for room allotment decisions.
// No database calls — just validation functions.
//
// KEY CHANGE from v1:
//   - Now supports ROOM SWITCHING (student can change rooms)
//   - Validates allotment window (open/closed)
//   - Checks room blocked status
//   - Old "existingAllotment blocks you" rule is REMOVED
//     (students can now switch during open window)
//
// RULES:
//   1. Allotment window must be open
//   2. Room must exist and not be blocked
//   3. Room must have available capacity
//   4. If switching, the target room capacity check must
//      NOT count the student's old room (they're leaving it)
// ============================================================

/**
 * Validates whether an allotment or room switch is allowed.
 * Pure function — no DB calls.
 *
 * @param {object} params
 * @param {object|null} params.room            - Target room object { id, room_number, capacity }
 * @param {number}      params.currentOccupancy - Current people in target room
 * @param {boolean}     params.isBlocked        - Is the target room blocked?
 * @param {boolean}     params.windowOpen       - Is the allotment window currently open?
 * @returns {{ allowed: boolean, reason: string }}
 */
function validateAllotment({ room, currentOccupancy, isBlocked, windowOpen }) {
  // Rule 1: Allotment window must be open
  if (!windowOpen) {
    return {
      allowed: false,
      reason: "Allotment window is closed. Room changes are not allowed right now.",
    };
  }

  // Rule 2: Room must exist
  if (!room) {
    return { allowed: false, reason: "Room not found." };
  }

  // Rule 3: Room must not be blocked
  if (isBlocked) {
    return {
      allowed: false,
      reason: `Room ${room.room_number} is blocked: ${room.block_reason || "Unavailable"}`,
    };
  }

  // Rule 4: Room must have space
  if (currentOccupancy >= room.capacity) {
    return { allowed: false, reason: `Room ${room.room_number} is full.` };
  }

  return { allowed: true, reason: "Allotment allowed." };
}

// Kept for backward compatibility, but validateAllotment is preferred
function canAllotRoom({ room, currentOccupancy, existingAllotment }) {
  return validateAllotment({
    room,
    currentOccupancy,
    isBlocked: room?.is_blocked || false,
    windowOpen: true,
  });
}

module.exports = { validateAllotment, canAllotRoom };
