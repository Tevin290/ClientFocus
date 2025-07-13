# ClientFocus Application Documentation

## Overview

ClientFocus is a comprehensive coaching session management platform built with Next.js, Firebase, and Stripe. It streamlines the process of logging, reviewing, and billing for coaching sessions while providing role-based access control for different user types.

## 🎯 Purpose

The application serves as a multi-tenant coaching platform that enables:
- **Coaches** to log session details and manage their clients
- **Admins** to review sessions and manage billing
- **Clients** to view their session history and manage payments
- **Super Admins** to oversee entire platform operations

## 🏗️ Architecture

### Technology Stack

- **Frontend**: Next.js 15 with React 18
- **UI Components**: Radix UI with Tailwind CSS
- **Backend**: Firebase (Authentication, Firestore, Storage)
- **Payments**: Stripe Connect for multi-tenant billing
- **AI**: Google Genkit for session note summarization
- **Forms**: React Hook Form with Zod validation
- **Styling**: Tailwind CSS with custom design system

### Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (app)/             # Main application routes
│   │   ├── admin/         # Admin dashboard & management
│   │   ├── coach/         # Coach session logging & client management
│   │   └── client/        # Client portal & history
│   ├── api/               # API routes (Stripe webhooks)
│   ├── login/             # Authentication pages
│   └── signup/
├── components/            # Reusable UI components
│   ├── forms/            # Complex form components
│   ├── shared/           # Shared components
│   └── ui/               # Base UI components (shadcn/ui)
├── context/              # React contexts (role management)
├── lib/                  # Utility functions & services
└── ai/                   # Genkit AI flows
```

## 🎭 User Roles & Permissions

### 1. **Super Admin** (`super-admin`)
- **Access**: Full platform control
- **Permissions**:
  - Manage Stripe billing settings
  - Review and bill all sessions
  - Oversee all companies and users
  - Generate dummy data for testing

### 2. **Admin** (`admin`)
- **Access**: Company-level management
- **Permissions**:
  - Review submitted sessions
  - Approve sessions for billing
  - Manage coaches within their company
  - View dashboard analytics

### 3. **Coach** (`coach`)
- **Access**: Session logging and client management
- **Permissions**:
  - Log new coaching sessions
  - View and edit their sessions
  - Manage assigned clients
  - View personal dashboard with statistics

### 4. **Client** (`client`)
- **Access**: Personal session history
- **Permissions**:
  - View session history and notes
  - Manage payment methods
  - Switch between coaches
  - Access session recordings (when available)

## 🔄 Core Workflows

### Session Management Workflow

1. **Session Logging** (Coach)
   - Coach logs session details through form
   - AI can summarize session notes using Genkit
   - Session submitted with status "Submitted"

2. **Session Review** (Admin)
   - Admin reviews submitted sessions
   - Can approve, reject, or mark as "Needs Review"
   - Approved sessions move to billing queue

3. **Billing Process** (Super Admin)
   - Super Admin reviews approved sessions
   - Marks sessions as "Billed" once processed
   - Stripe integration handles payment processing

### User Authentication & Role Assignment

1. **Signup Process**:
   - Email-based role determination
   - Clients must select a coach during signup
   - Automatic company assignment based on role

2. **Role-Based Routing**:
   - Automatic redirection to appropriate dashboard
   - Route protection based on user permissions
   - Dynamic navigation menu based on role

## 💳 Stripe Integration

### Multi-Tenant Billing Architecture

The application uses **Stripe Connect** to enable multi-tenant billing:

- **Platform Account**: Main Stripe account for the application
- **Connected Accounts**: Each company has their own Stripe Express account
- **Customer Management**: Clients are customers in their company's Stripe account

### Payment Flow

1. **Company Onboarding**:
   - Super Admin connects company's Stripe account
   - Stripe webhook updates onboarding status
   - Enables billing for that company

2. **Client Payment Setup**:
   - Clients add payment methods via Stripe Checkout
   - Payment methods stored in company's Stripe account
   - Ready for future billing cycles

3. **Session Billing**:
   - Sessions marked as "Billed" trigger payment processing
   - Invoices generated in company's Stripe account
   - Webhook events update payment status

### Stripe Modes

- **Test Mode**: For development and testing
- **Live Mode**: For production billing
- Toggle between modes in admin settings

## 🤖 AI Integration (Genkit)

### Session Note Summarization

The application includes AI-powered summarization of coaching session notes:

```typescript
// AI Flow Definition
const summarizeSessionNotesFlow = ai.defineFlow({
  name: 'summarizeSessionNotesFlow',
  inputSchema: SummarizeSessionNotesInputSchema,
  outputSchema: SummarizeSessionNotesOutputSchema,
}, async input => {
  const {output} = await prompt(input);
  return output!;
});
```

**Features**:
- Uses Google Gemini 2.0 Flash model
- Extracts key discussion points from session notes
- Integrated into session logging form
- Helps coaches create concise summaries

## 🔥 Firebase Services

### Authentication
- Email/password authentication
- User profile management
- Role-based access control

### Firestore Database Structure

```
companies/
├── {companyId}
│   ├── name
│   ├── stripeAccountId_test
│   ├── stripeAccountId_live
│   └── stripeAccountOnboarded_*

users/
├── {userId}
│   ├── displayName
│   ├── email
│   ├── role
│   ├── companyId
│   ├── coachId (for clients)
│   └── stripeCustomerId_*

sessions/
├── {sessionId}
│   ├── coachId
│   ├── clientId
│   ├── companyId
│   ├── sessionDate
│   ├── sessionType
│   ├── sessionNotes
│   ├── summary
│   ├── status
│   └── videoLink
```

### Storage
- Profile picture uploads
- Session recordings and documents
- CORS configuration for web uploads

## 🎨 Design System

### Color Palette
- **Primary**: Crimson Red (`#C62828`) - buttons, headers, highlights
- **Accent**: Neon Yellow-Green (`#D4FF00`) - CTAs, toggles, attention
- **Background**: Soft Gray (`#F5F5F5`) - main background
- **Text**: Charcoal Gray (`#2C2C2C`) - primary text
- **Cards**: White (`#FFFFFF`) - content panels
- **Success**: Soft Green (`#81C784`) - confirmations

### Typography
- **Font**: Poppins (modern, geometric sans-serif)
- **Headlines**: 600-700 weight, 28-32px
- **Subheadings**: 500 weight, 20-24px
- **Body**: 400 weight, 16px
- **Labels**: 300-400 weight, 12-14px

## 🛠️ Development

### Environment Configuration

Required environment variables:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Stripe Configuration
STRIPE_SECRET_KEY_TEST=
STRIPE_SECRET_KEY_LIVE=
STRIPE_WEBHOOK_SECRET_TEST=
STRIPE_WEBHOOK_SECRET_LIVE=
STRIPE_CONNECT_CLIENT_ID_TEST=
STRIPE_CONNECT_CLIENT_ID_LIVE=

# Application Settings
NEXT_PUBLIC_APP_URL=http://localhost:9002
NEXT_PUBLIC_ADMIN_EMAILS=admin@company.com
```

### Development Commands

```bash
# Development server
npm run dev

# Genkit AI development
npm run genkit:dev
npm run genkit:watch

# Build and deployment
npm run build
npm start

# Code quality
npm run lint
npm run typecheck
```

### Key Development Scripts

- **Dev Server**: Runs on port 9002 with Turbopack
- **Genkit Development**: Separate process for AI flow development
- **Type Checking**: Ensures TypeScript compliance

## 🔒 Security Features

### Firestore Security Rules
- Role-based data access
- Company-scoped data isolation
- User-specific profile access

### Authentication Security
- Firebase Authentication integration
- JWT token validation
- Automatic session management

### Stripe Security
- Webhook signature verification
- Test/Live mode separation
- Connected account isolation

## 📊 Features by Role

### Coach Dashboard
- Monthly session statistics
- Session count trends
- Quick access to logging
- Client management

### Admin Dashboard
- Company-wide session overview
- Coach performance metrics
- Session approval queue
- Analytics and reporting

### Client Portal
- Personal session history
- Session notes and recordings
- Payment method management
- Coach selection

## 🚀 Deployment Considerations

### Firebase Deployment
- Firestore security rules deployment
- Storage security rules
- Cloud Functions (if used)

### Environment-Specific Configuration
- Development: Local Firebase emulators
- Staging: Test Stripe mode
- Production: Live Stripe mode

### Performance Optimizations
- Next.js App Router for code splitting
- Firestore query optimization
- Image optimization for profiles
- Lazy loading for large datasets

## 🧪 Testing Features

### Dummy Data Generation
- Admin can generate test clients and sessions
- Helps with development and demonstration
- Company-scoped test data

### Development Tools
- Firebase console integration
- Stripe dashboard access
- Genkit development interface

## 📈 Analytics & Monitoring

### Built-in Analytics
- Session counts by coach
- Monthly performance metrics
- Company-wide statistics
- Payment tracking

### Error Handling
- Comprehensive error boundaries
- User-friendly error messages
- Development error logging
- Stripe webhook error handling

---

This documentation provides a comprehensive overview of the ClientFocus application, its architecture, features, and development processes. The application represents a full-stack coaching management platform with enterprise-grade features for session management, billing, and user administration.
