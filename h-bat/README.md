# H-BAT Web Application

H-BAT (Hearing-Based Audio Tests) is a web application for measuring rhythm perception abilities including beat saliency, beat interval, and beat finding tests.

## Features

- **Hearing Threshold Measurement**: Pure tone audiometry at 1kHz, 2kHz, 4kHz
- **Beat Saliency Test (BST)**: 2-beat vs 3-beat discrimination
- **Beat Interval Test (BIT)**: Accelerando vs Ritardando detection
- **Beat Finding & Interval Test (BFIT)**: Complex rhythm pattern analysis
- **Admin Dashboard**: Session management and data export
- **Real-time Audio Processing**: Tone.js-based precise audio synthesis

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account (for database and authentication)

### Installation

1. Clone the repository and install dependencies:

```bash
npm install
```

2. Set up environment variables:

```bash
cp .env.example .env.local
# Edit .env.local with your Supabase credentials
```

3. Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
