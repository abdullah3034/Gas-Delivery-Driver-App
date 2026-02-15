# GAS Delivery Driver App

Offline-first React Native (Expo) demo for LPG delivery drivers. Data is stored locally in SQLite and seeded on first launch.

## Features

- Vehicle-based orders (assigned per vehicle)
- Start delivery -> confirm delivery workflow
- Partial deliveries and remaining delivery completion
- Payments (cash, cheque, credit) with cash change handling
- Thermal-style receipt with per-delivery breakdown
- Inventory tracking per vehicle with load/return operations
- Dashboard with commission, payments, inventory mix, delivery progress
- Commission configuration from Menu

## Tech Stack

- Expo + React Native + TypeScript
- expo-router
- expo-sqlite (local persistence)

## Setup

```bash
npm install
npx expo start
```

## Database

SQLite is initialized in `db/index.ts` and seeded from `db/seed.ts`.

- Database name: `gas-driver-demo-v2.db`
- Seed runs once on first launch

### Reseed (reset data)

Android device:

1. Settings -> Apps -> your app (Expo Go or standalone)
2. Storage -> Clear Data
3. Relaunch the app

## Core Flows

1. Select vehicle on Home
2. View assigned orders
3. Start delivery -> Confirm delivery
4. Record payment
5. View receipt

## Notes / Assumptions

- Commission = (cash + cheque + credit for today) \* commission rate
- Commission target is a daily currency target
- Partial deliveries are supported; remaining delivery can be completed later
- Receipt lists delivery history when more than one delivery

## Folder Guide

- `app/` screens (expo-router)
- `db/` schema + seed + init
- `repositories/` data access
- `hooks/` data hooks
- `types/` shared types

## Known Limitations

- No backend
- No auth
- Printing is simulated via receipt screen
