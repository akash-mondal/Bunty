# Frontend Application

Next.js 14 frontend for the Bunty ZKP platform.

## Structure

```
frontend/
├── src/
│   ├── app/               # Next.js App Router pages
│   ├── components/        # React components
│   ├── services/          # API clients and service integrations
│   ├── hooks/             # Custom React hooks
│   ├── utils/             # Utility functions
│   └── types/             # TypeScript type definitions
└── package.json
```

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Features

- User authentication and registration
- Plaid Link integration for bank account connection
- Stripe Identity integration for KYC verification
- Lace Wallet integration for transaction signing
- Client-side witness construction and storage
- Local proof generation via proof server
- Proof submission to Midnight Network

## Environment Variables

Configure in root `.env` file:
- `NEXT_PUBLIC_API_URL` - Backend API URL
- `NEXT_PUBLIC_MIDNIGHT_NETWORK` - Midnight network (testnet/mainnet)
