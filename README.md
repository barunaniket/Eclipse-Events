# Eclipse - CodeChef Event Management Portal

A comprehensive event management system for PESU ECC hackathons. Eclipse provides team registration, QR-based check-in, and meal distribution tracking.

## Features

- **Team Registration** - Multi-step registration with track selection, member management, and payment verification
- **QR Check-In** - Time-limited (30-second) QR codes for secure venue entry
- **Meal Distribution** - QR-based tracking for lunch and snacks distribution
- **Volunteer Dashboard** - Real-time scanning with live venue statistics
- **Role-based Access** - Separate dashboards for Candidates and Volunteers

## Tech Stack

| Technology | Purpose |
|------------|---------|
| Next.js 16 | Frontend framework (App Router) |
| React 19 | UI library |
| TypeScript | Type safety |
| Tailwind CSS 4 | Styling |
| Supabase | Auth, Database, Storage |
| Framer Motion | Animations |
| react-qr-code | QR generation |
| html5-qrcode | QR scanning |

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase project

### Installation

```bash
npm install
```

### Configuration

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
app/
├── api/
│   ├── generate-qr/     # QR token generation
│   └── register/        # Team registration
├── candidate/           # Candidate dashboards
├── volunteer/           # Volunteer dashboards
├── registration/        # Registration page
└── page.tsx             # Landing page

components/
├── auth/                # Authentication components
├── registration/        # Registration forms
└── volunteer/           # QR scanning components
```

## API Endpoints

### POST /api/register
Register a new team with members.

### POST /api/generate-qr
Generate a 30-second secure QR token.
