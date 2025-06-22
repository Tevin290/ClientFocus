
# SessionSync

Streamline your coaching sessions and client management with SessionSync. This Next.js application leverages Firebase for backend services (Auth, Firestore) and Genkit for AI-powered features.

## Core Features:

- Role Management: Admin, Coach, and Client roles with differentiated permissions.
- Session Logging: Coaches can log session details including client info, notes, video links, and session type.
- Session Review: Admins can review submitted sessions and manage billing.
- Dashboards: Tailored dashboards for Admins (platform overview) and Coaches (session statistics).
- Client Portal: Clients can view their session history, notes, and recordings.
- Stripe Integration: Settings for Stripe API keys and test mode management.
- AI Summarization: Genkit-powered summarization of session notes.

## Getting Started

### Prerequisites

- Node.js (v18 or later recommended)
- npm or yarn
- Firebase Project:
    - Set up Firebase Authentication (Email/Password provider enabled).
    - Set up Firestore database.
    - Set up Firebase Storage.
    - Obtain your Firebase project configuration credentials.

### Environment Configuration

1.  **Firebase Configuration:**
    Update `src/lib/firebase.ts` with your Firebase project's configuration details:
    ```typescript
    const firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "YOUR_API_KEY",
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "YOUR_AUTH_DOMAIN",
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "YOUR_PROJECT_ID",
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "YOUR_STORAGE_BUCKET",
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "YOUR_MESSAGING_SENDER_ID",
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "YOUR_APP_ID",
      measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "YOUR_MEASUREMENT_ID" // Optional
    };
    ```
    Alternatively, and recommended for security, use environment variables. Create a `.env.local` file in the project root:
    ```env
    NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
    NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id # Optional

    # For pre-approved admin emails during signup
    # Default admin email is 'hello@hmperform.com' if this is not set.
    # To use multiple, separate them with commas: admin1@hmperform.com,superadmin@hmperform.com
    NEXT_PUBLIC_ADMIN_EMAILS=hello@hmperform.com 
    ```

2.  **Security Rules (Firestore & Storage):**
    Deploy the security rules located in `firestore.rules` and `storage.rules` to your Firebase project. These rules are crucial for controlling access to your data and enabling file uploads.
    Use the Firebase CLI:
    ```bash
    # Deploy both Firestore and Storage rules
    firebase deploy --only firestore,storage
    ```
    Alternatively, you can deploy them individually:
    ```bash
    firebase deploy --only firestore:rules
    firebase deploy --only storage
    ```
    Ensure you are logged into the Firebase CLI (`firebase login`) and have selected the correct project (`firebase use YOUR_PROJECT_ID`).


### Installation

```bash
npm install
# or
yarn install
```

### Running the Development Server

```bash
npm run dev
# or
yarn dev
```
The application will be available at `http://localhost:9002` (or the port specified in `package.json`).

## Manual Verification Steps for Signup Flow

After deploying the updated code and Firestore rules:

1.  **Sign up as a Client (External Email):**
    *   Navigate to the `/signup` page.
    *   Use an email address that **does not** end with `@hmperform.com` (e.g., `testclient@example.com`).
    *   Select any role in the form (the system will override it to 'client').
    *   Complete the signup process.
    *   **Expected Outcome:**
        *   User is created in Firebase Authentication.
        *   A new document is created in the `users` collection in Firestore with the user's UID as the document ID.
        *   The Firestore document should contain:
            *   `uid`: matching the auth UID.
            *   `email`: the email used for signup.
            *   `displayName`: the name entered.
            *   `role`: `"client"`.
            *   `createdAt`: a server timestamp.
        *   No permission errors should occur. User is redirected to login or client dashboard.

2.  **Sign up as a Coach (Company Email - Non-Admin):**
    *   Navigate to the `/signup` page.
    *   Use an email address that ends with `@hmperform.com` but is **not** `hello@hmperform.com` (or any email in your `NEXT_PUBLIC_ADMIN_EMAILS` list if configured), e.g., `testcoach@hmperform.com`.
    *   Select any role (system will override to 'coach').
    *   Complete the signup process.
    *   **Expected Outcome:**
        *   User is created in Firebase Authentication.
        *   A new document is created in the `users` collection in Firestore.
        *   The Firestore document should contain `role`: `"coach"`.
        *   No permission errors.

3.  **Sign up as an Admin (Pre-approved Company Email):**
    *   Ensure an email like `hello@hmperform.com` (or one from your `NEXT_PUBLIC_ADMIN_EMAILS` env var) is used.
    *   Navigate to the `/signup` page.
    *   Use this pre-approved admin email.
    *   Select any role (system will assign 'admin').
    *   Complete the signup process.
    *   **Expected Outcome:**
        *   User is created in Firebase Authentication.
        *   A new document is created in the `users` collection in Firestore.
        *   The Firestore document should contain `role`: `"admin"`.
        *   No permission errors.

4.  **Attempt Signup with External Email and Forced Coach/Admin Role (via form selection - Zod should catch this):**
    *   Navigate to the `/signup` page.
    *   Use an external email (e.g., `attacker@example.com`).
    *   Try to select "Coach" or "Admin" role in the radio group.
    *   **Expected Outcome:**
        *   The form validation (Zod schema) should prevent submission or show an error message indicating that Coach/Admin roles require an `@hmperform.com` email.
        *   If somehow submitted, the auto-assignment logic in `onSubmit` will assign 'client', and Firestore rules would deny if an invalid role/domain combination was attempted.

## Deployment

1.  **Deploy Firestore & Storage Rules:**
    ```bash
    firebase deploy --only firestore,storage
    ```

2.  **Deploy Frontend Application:**
    Deploy your Next.js application to your preferred hosting provider (e.g., Vercel, Firebase Hosting, Netlify, Google Cloud App Hosting). Ensure all environment variables (especially Firebase config and `NEXT_PUBLIC_ADMIN_EMAILS`) are set up in your deployment environment.
    For Firebase App Hosting (if `apphosting.yaml` is configured):
    ```bash
    firebase apphosting:backends:deploy
    ```
    Or follow your hosting provider's specific deployment instructions.

## Genkit (AI Features)

To run Genkit flows locally for development (e.g., for `summarizeSessionNotes`):
```bash
npm run genkit:dev
# or for watching changes
npm run genkit:watch
```
Ensure your Google AI API keys are set up if using Google AI models with Genkit. Refer to Genkit documentation for configuration.
```
This README provides a basic setup guide. You can expand it with more details about your project architecture, specific component usage, and contribution guidelines.
