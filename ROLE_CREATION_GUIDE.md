# Role Creation Guide

This guide explains how to create each type of user role in the coaching platform system.

## Overview

The platform supports four distinct user roles:
- **Super Admin**: Full access including billing and payment management
- **Admin**: Session review and approval (no billing access)
- **Coach**: Session logging and client management
- **Client**: Session viewing and booking

All users are organized under companies for data isolation and white-label functionality.

## Prerequisites

1. Firebase project configured
2. Firestore security rules deployed
3. Stripe Connect set up (for billing features)
4. Application deployed and accessible

## Step 1: Create a Company

Before creating any users, you must first create a company that will contain all the users.

### Option A: Via Admin Interface (Recommended)

1. **Access Admin Settings**
   - Navigate to `/admin/settings` in your application
   - You'll need an existing super-admin account for this

2. **Create New Company**
   - Find the "Create Company" section
   - Fill out the company form:
     ```
     Company Name: Hearts & Minds Coaching
     Company Slug: hearts-minds (auto-generated, must be unique)
     Logo URL: https://example.com/logo.png (optional)
     Primary Color: #3B82F6 (optional)
     Secondary Color: #10B981 (optional)
     ```
   - Click "Create Company"
   - Note the Company ID returned (you'll need this)

### Option B: Via Code/Database (Development)

```typescript
// Use the createCompany function from firestoreService.ts
import { createCompany } from '@/lib/firestoreService';

const companyData = {
  name: "Hearts & Minds Coaching",
  slug: "hearts-minds", // Must be unique
  branding: {
    logoUrl: "https://example.com/logo.png",
    primaryColor: "#3B82F6",
    secondaryColor: "#10B981",
    backgroundColor: "#FFFFFF",
    textColor: "#000000"
  }
};

const result = await createCompany(companyData);
console.log("Company ID:", result.companyId);
```

## Step 2: Create Super Admin

The Super Admin has the highest level of access and can manage billing.

### Required Information:
- Email address
- Display name  
- Company ID (from Step 1)

### Creation Process:

1. **Firebase Authentication**
   ```typescript
   // Create user in Firebase Auth first
   import { createUserWithEmailAndPassword } from 'firebase/auth';
   import { auth } from '@/lib/firebase';
   
   const userCredential = await createUserWithEmailAndPassword(
     auth, 
     "superadmin@heartsminds.com", 
     "securePassword123"
   );
   const uid = userCredential.user.uid;
   ```

2. **Create Firestore Profile**
   ```typescript
   import { createUserProfileInFirestore } from '@/lib/firestoreService';
   
   await createUserProfileInFirestore(uid, {
     email: "superadmin@heartsminds.com",
     displayName: "Super Administrator",
     role: "super-admin",
     companyId: "your-company-id-here", // From Step 1
     photoURL: null // Optional
   });
   ```

### Super Admin Capabilities:
- Access to `/admin/billing` - Stripe Connect setup and billing management
- Can bill approved sessions to clients
- View all coaches, clients, and sessions within company
- Approve/deny sessions (inherits admin capabilities)
- Manage company settings and branding

## Step 3: Create Admin

Admins handle session review and approval but cannot manage billing.

### Creation Process:

1. **Firebase Authentication** (same as above with different email)
2. **Create Firestore Profile**
   ```typescript
   await createUserProfileInFirestore(uid, {
     email: "admin@heartsminds.com",
     displayName: "Platform Administrator", 
     role: "admin",
     companyId: "your-company-id-here",
     photoURL: null
   });
   ```

### Admin Capabilities:
- Access to `/admin/sessions` - Session review interface
- Approve or deny sessions submitted by coaches
- View all coaches and their clients within company
- Cannot access billing or payment features
- Cannot bill clients directly

## Step 4: Create Coach

Coaches log sessions and manage their assigned clients.

### Creation Process:

1. **Firebase Authentication**
2. **Create Firestore Profile**
   ```typescript
   await createUserProfileInFirestore(uid, {
     email: "coach@heartsminds.com",
     displayName: "John Smith",
     role: "coach", 
     companyId: "your-company-id-here",
     photoURL: null
   });
   ```

### Coach Capabilities:
- Access to `/coach/dashboard` - Overview of clients and sessions
- `/coach/log-session` - Create new session entries
- `/coach/my-sessions` - View and edit their session history
- `/coach/my-clients` - View assigned clients and client sessions
- Can only see clients assigned to them within their company

## Step 5: Create Client

Clients view their sessions and can book new ones.

### Creation Process:

1. **Client Self-Registration** (Recommended)
   - Clients can sign up at `/signup`
   - They select their coach during registration
   - Automatically assigned to coach's company

2. **Manual Creation**
   ```typescript
   await createUserProfileInFirestore(uid, {
     email: "client@example.com",
     displayName: "Jane Doe",
     role: "client",
     companyId: "your-company-id-here", 
     coachId: "coach-user-id-here" // Required for clients
   });
   ```

### Client Capabilities:
- Access to `/client/dashboard` - Session overview and booking
- `/client/history` - View past sessions and notes
- `/client/settings` - Profile management
- Can only see their own sessions and data
- Book sessions with their assigned coach

## Step 6: Configure Stripe (For Billing)

Super admins need to connect Stripe for client billing functionality.

### Setup Process:

1. **Access Billing Settings**
   - Super admin logs in and goes to `/admin/billing`

2. **Connect Stripe Account**
   - Click "Connect with Stripe" 
   - Complete Stripe Connect onboarding
   - Verify account is fully onboarded

3. **Test Billing**
   - Have a coach log a session
   - Admin approves the session
   - Super admin can now bill the session to the client

## Data Flow Summary

```
1. Coach logs session → Status: "Under Review"
2. Admin reviews → Approves → Status: "Approved" 
3. Super Admin sees approved session → Bills client → Status: "Billed"
4. Client is charged via Stripe
```

## Important Notes

### Security
- All users are isolated to their company's data
- Role-based access controls prevent unauthorized access
- Firestore security rules enforce company-level data isolation

### Company Isolation
- Users can only see data from their own company
- Company ID is required for all user profiles
- Sessions, clients, and coaches are filtered by company

### Role Hierarchy
```
Super Admin > Admin > Coach > Client
```

### Stripe Integration
- Each company has separate Stripe accounts (test and live)
- Super admins manage payment processing for their company
- Clients are billed through the company's Stripe account

## Troubleshooting

### Common Issues:

1. **User can't access expected pages**
   - Verify role is set correctly in Firestore
   - Check that companyId matches expected company
   - Ensure Firebase Auth and Firestore profile are both created

2. **Billing not working**
   - Confirm Stripe Connect is fully onboarded
   - Check that company has stripeAccountOnboarded_test/live set to true
   - Verify sessions have correct status flow

3. **Company isolation not working**
   - Ensure all users have correct companyId
   - Check Firestore security rules are deployed
   - Verify queries include company filtering

### Development Tools:

- Use `/src/lib/seedData.ts` to create sample data
- Check browser console for detailed error messages
- Monitor Firestore usage in Firebase console

## Next Steps

After creating roles:
1. Test the complete session workflow
2. Configure company branding
3. Set up Stripe Connect for billing
4. Train users on their respective interfaces
5. Monitor system usage and performance



 Method 1 (Easiest): Sign up with email
  supersuper@hmperform.com - this is
  automatically assigned super-admin role in
  src/app/signup/page.tsx:43-58.

  Method 2: Add super-admin emails to
  NEXT_PUBLIC_ADMIN_EMAILS environment
  variable and modify the role determination
  logic.

  Method 3: Use the seed data functions in
  src/lib/seedData.ts to programmatically
  create a super-admin user with the role set
   to 'super-admin'.

  The super-admin role gets full access to
  admin features including billing, coaches
  management, and session review.