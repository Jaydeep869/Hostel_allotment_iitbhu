# Allotment Rules — Hostel Allotment IIT BHU

## Who Can Apply?

- Only students with a valid `@itbhu.ac.in` email address.
- Email is verified via a 6-digit OTP sent by Supabase Auth.

## Profile Requirements

Before selecting a room, students must complete their profile:
- Full Name (minimum 2 characters)
- Branch (from approved list: CSE, ECE, EE, ME, CE, CHE, etc.)
- Year (1 to 5)

## Room Allotment Rules

1. **One room per student** — A student can only be allotted to one room. Once allotted, they cannot switch rooms (through the app).

2. **Room capacity** — Each room has a fixed capacity (default: 2 for double occupancy). A room is marked "Full" when `occupied >= capacity`.

3. **First-come, first-served** — Rooms are allotted on a first-come basis. There is no priority system or waitlist in v1.

4. **No cancellation** — Once allotted, the allotment cannot be cancelled by the student through the app. An admin would need to delete the allotment row from the database.

## Supported Hostels

| Hostel | Rooms | Capacity per Room |
|--------|-------|-------------------|
| Satish Dhawan Hostel | 20 (101-110, 201-210) | 2 |

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Room full | Allotment denied with "Room is full" message |
| Student already allotted | Allotment denied with "Already allotted" message |
| Two students allot same room simultaneously | Database UNIQUE constraint prevents duplicates; one succeeds, one gets an error |
| Invalid room_id | Allotment denied with "Room not found" |
| Expired OTP | Login fails with "Invalid or expired OTP" |

## Future Improvements (Not Implemented)

- [ ] Admin panel for managing allotments
- [ ] Room swap requests between students
- [ ] Priority-based allotment (CGPA, year-wise)
- [ ] Waitlist for full rooms
- [ ] Multiple hostel support
- [ ] Room preferences (1st, 2nd, 3rd choice)
