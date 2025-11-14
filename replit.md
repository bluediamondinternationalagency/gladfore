# Gladfore MVP - Fertilizer Credit Platform

## Overview
Gladfore is a digital platform that enables farmers to purchase fertilizer with 50% down payment, managed through a network of agents and administrators.

## Project Status
Currently implementing the MVP with the following features:
- ✅ Landing page with conversion-optimized design
- ✅ Role-based authentication (Admin, Agent, Farmer)
- ✅ PostgreSQL database with Drizzle ORM
- ✅ Session-based authentication
- ✅ Admin dashboard for order management and farmer uploads
- ✅ Agent dashboard for creating orders
- ✅ Farmer portal for tracking orders
- 🚧 Testing and refinement in progress

## Architecture
- **Frontend**: React + TypeScript + Vite + Tailwind CSS + Shadcn UI
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL (via Neon) with Drizzle ORM
- **Authentication**: Express-session with PostgreSQL store
- **Design**: Mobile-first responsive design with green agricultural theme

## Test Credentials
The database has been seeded with test users for development:

| Role   | Phone           | Password   |
|--------|-----------------|------------|
| Admin  | +254700000000   | admin123   |
| Agent  | +254711111111   | agent123   |
| Farmer | +254712345678   | farmer123  |

## Key Features

### Admin
- CSV farmer upload
- Order approval/rejection workflow
- Financial dashboard (total payments, pending debts)
- View all pending orders

### Agent
- Farmer search by phone or ID
- Create orders with automatic 50% down payment calculation
- Strict validation ensuring payment = 50% of cost
- Order submission for admin approval

### Farmer
- View order history
- Track repayment status
- See outstanding balances and due dates

## Database Schema
- **users**: Authentication and user roles
- **farmers**: Farmer profiles linked to agents
- **orders**: Order records with payment tracking

## Business Logic
The 50% down payment validation is implemented in `shared/logic/paymentUtils.ts`:
- `calculateDownPayment()`: Returns exactly 50% of total cost
- `validateDownPayment()`: Ensures payment is within 1 cent of 50%
- `formatCurrency()`: Formats amounts in NGN currency (Nigerian Naira)

This shared logic can be reused in future React Native mobile app.

## Migration Path to Serverless
The current MVP uses Express for rapid development. Future migration to Supabase + Netlify serverless:
1. Replace Express routes with Netlify Functions
2. Replace PostgreSQL storage with Supabase client
3. Implement Supabase Row-Level Security policies
4. Deploy frontend to Netlify CDN
5. Migrate sessions to Supabase Auth

## Running the Project
```bash
npm install
npm run db:push  # Sync database schema
tsx server/seed.ts  # Seed test data
npm run dev  # Start development server
```

## Recent Changes
- Implemented complete authentication system with session management
- Created database schema for users, farmers, and orders
- Built admin, agent, and farmer dashboards with real API integration
- Added CSV upload functionality for bulk farmer import
- Implemented order approval workflow with status tracking
- Created seed script for test users and sample data
