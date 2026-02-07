// ============================================================
// Email Parser — Extract name, branch, year from IIT BHU email
// ============================================================
// IIT BHU email format: firstname.lastname.branchYY@itbhu.ac.in
//   Example: rahul.sharma.cse22@itbhu.ac.in
//     → name: "Rahul Sharma"
//     → branch: "CSE"
//     → admissionYear: 2022
//     → currentYear: calculated from current academic year
//
// WHY parse from email?
//   The institute email IS the source of truth. Parsing
//   eliminates manual input errors and fake profiles.
//
// EDGE CASES:
//   - Three-letter branches: cse, ece, mec, min, met, cer, phe
//   - Longer branches: arch, pharma
//   - Some emails may have middle names: a.b.c.cse22@itbhu.ac.in
// ============================================================

// Map of short codes in emails → display branch names
const BRANCH_MAP = {
  cse: "CSE",
  ece: "ECE",
  eee: "EE",
  ee: "EE",
  me: "ME",
  mec: "ME",
  ce: "CE",
  civil: "CE",
  che: "CHE",
  chem: "CHE",
  mme: "MME",
  met: "MME",
  mse: "MSE",
  bme: "BME",
  phe: "PHE",
  pharma: "PHARMA",
  mnc: "MNC",
  ep: "EP",
  phy: "EP",
  arch: "ARCH",
  min: "Mining",
  mining: "Mining",
  cer: "CER",
  bce: "BCE",
};

/**
 * Parse an IIT BHU email into structured profile data.
 *
 * @param {string} email — e.g. "rahul.sharma.cse22@itbhu.ac.in"
 * @returns {{ name: string, branch: string, year: number, admissionYear: number } | null}
 *          Returns null if email format is not parseable
 */
function parseEmail(email) {
  if (!email || !email.endsWith("@itbhu.ac.in")) {
    return null;
  }

  // Get the part before @ → "rahul.sharma.cse22"
  const localPart = email.split("@")[0];

  // Split by dots → ["rahul", "sharma", "cse22"]
  const parts = localPart.split(".");

  if (parts.length < 3) {
    // Need at least firstname.lastname.branchYY
    return null;
  }

  // Last part contains branch code + admission year
  // e.g., "cse22" → branch="cse", yearStr="22"
  const lastPart = parts[parts.length - 1].toLowerCase();

  // Extract the year digits from the end (last 2 chars)
  const yearMatch = lastPart.match(/^([a-z]+)(\d{2})$/);

  if (!yearMatch) {
    return null;
  }

  const branchCode = yearMatch[1];        // "cse"
  const admissionYearShort = parseInt(yearMatch[2], 10); // 22

  // Convert 2-digit year to 4-digit: 22 → 2022
  const admissionYear = admissionYearShort >= 50
    ? 1900 + admissionYearShort  // unlikely but safe
    : 2000 + admissionYearShort;

  // Look up branch display name
  const branch = BRANCH_MAP[branchCode] || branchCode.toUpperCase();

  // Name = all parts except the last one, capitalized
  // ["rahul", "sharma"] → "Rahul Sharma"
  const nameParts = parts.slice(0, parts.length - 1);
  const name = nameParts
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");

  // Calculate current year of study
  // Academic year starts in July, so:
  //   If current month >= 7 (July), academic year = current calendar year
  //   If current month < 7, academic year = current calendar year - 1
  const now = new Date();
  const currentMonth = now.getMonth() + 1; // 1-indexed
  const currentCalendarYear = now.getFullYear();
  const academicYear = currentMonth >= 7 ? currentCalendarYear : currentCalendarYear - 1;
  let yearOfStudy = academicYear - admissionYear + 1;

  // Clamp between 1 and 5 (IDD students can be in 5th year)
  yearOfStudy = Math.max(1, Math.min(5, yearOfStudy));

  return {
    name,
    branch,
    year: yearOfStudy,
    admissionYear,
  };
}

module.exports = { parseEmail, BRANCH_MAP };
