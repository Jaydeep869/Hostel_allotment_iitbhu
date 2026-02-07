# 🏠 Hostel Allotment — IIT (BHU) Varanasi

A full-stack web application for hostel room allotment at IIT BHU. Students verify their institute email via OTP, fill their profile, and select a room.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Backend | Node.js + Express |
| Database | PostgreSQL (Supabase) |
| Auth | Supabase Auth (Email OTP) |
| Styling | Plain CSS |

## Features

- ✅ Email OTP authentication (only `@itbhu.ac.in`)
- ✅ Student profile (name, branch, year)
- ✅ Room grid with real-time occupancy
- ✅ One-click room allotment
- ✅ Allotment confirmation page
- ✅ Rate limiting on auth routes
- ✅ Protected routes (JWT verification)

## Project Structure

```
├── backend/
│   ├── src/
│   │   ├── index.js           # Express entry point
│   │   ├── config/supabase.js # Supabase client setup
│   │   ├── middleware/auth.js # JWT verification
│   │   ├── routes/
│   │   │   ├── auth.js        # POST /auth/send-otp, /auth/verify-otp
│   │   │   ├── hostels.js     # GET /hostels
│   │   │   ├── rooms.js       # GET /rooms/:hostelId
│   │   │   ├── allot.js       # POST /allot, GET /allot/my
│   │   │   └── profile.js    # GET /profile, PUT /profile
│   │   └── services/
│   │       └── allotment.js   # Business logic (no DB dependency)
│   ├── migrations/
│   │   └── 001_initial_schema.sql
│   ├── seed/
│   │   └── seed.sql
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── pages/             # LoginPage, ProfilePage, RoomsPage, ConfirmationPage
│   │   ├── components/        # Navbar
│   │   ├── context/           # AuthContext
│   │   └── services/          # API helper (axios)
│   └── .env.example
├── docs/
│   └── allotment-rules.md
└── README.md
```

## Setup

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project

### 1. Database Setup

1. Go to your Supabase Dashboard → **SQL Editor**
2. Run `backend/migrations/001_initial_schema.sql` (creates tables)
3. Run `backend/seed/seed.sql` (seeds hostel + rooms)

### 2. Supabase Auth Setup

1. In Supabase Dashboard → **Authentication → Settings**
2. Enable **Email OTP** sign-in
3. (Optional) Customize the OTP email template

### 3. Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your Supabase credentials
npm install
npm run dev
```

Backend runs at `http://localhost:5000`

### 4. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/send-otp` | No | Send OTP to email |
| POST | `/auth/verify-otp` | No | Verify OTP, get token |
| GET | `/profile` | Yes | Get user profile |
| PUT | `/profile` | Yes | Update name/branch/year |
| GET | `/hostels` | Yes | List all hostels |
| GET | `/rooms/:hostelId` | Yes | List rooms with occupancy |
| POST | `/allot` | Yes | Allot a room |
| GET | `/allot/my` | Yes | Get current allotment |
| GET | `/health` | No | Health check |

## Allotment Rules

See [docs/allotment-rules.md](docs/allotment-rules.md) for full details.

- One room per student
- First-come, first-served
- Room must have available capacity
- Only `@itbhu.ac.in` emails

## License

Private — IIT (BHU) Varanasi
