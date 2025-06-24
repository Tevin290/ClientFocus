
# SessionSync

Streamline your coaching sessions and client management with SessionSync. This Next.js application leverages Firebase for backend services (Auth, Firestore) and Genkit for AI-powered features.

## Core Features:

- Role Management: Admin, Coach, and Client roles with differentiated permissions.
- Session Logging: Coaches can log session details including client info, notes, video links, and session type.
- Session Review: Admins can review submitted sessions and manage billing.
- Dashboards: Tailored dashboards for Admins (platform overview) and Coaches (session statistics).
- Client Portal: Clients can view their session history, notes, and recordings.
- Stripe Integration: Securely connect company Stripe accounts using Stripe Connect for multi-tenant billing.
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
- Stripe Account:
    - Create a Stripe account at [dashboard.stripe.com](https://dashboard.stripe.com).

### Environment Configuration

1.  **Create an Environment File:**
    - In the root of the project, create a file named `.env`.
    - Copy the contents of the `.env.example` file (if it exists) or use the placeholders below.

2.  **Configure Firebase:**
    - Update `src/lib/firebase.ts` with your Firebase project's configuration details, or for better security, add them to your `.env` file:
    ```env
    NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
    NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
    ```

3.  **Configure Stripe (Crucial for Billing):**
    - These variables are for **your platform's** Stripe account. They allow your app to manage connections for your users.
    - **Step 1: Get API Keys:**
        - Log in to your [Stripe Dashboard](https://dashboard.stripe.com).
        - Go to the **Developers** section.
        - Under **API keys**, find your **Secret key**. Use the "Test mode" key for development.
    - **Step 2: Create a Webhook:**
        - Under **Developers**, go to **Webhooks**.
        - Click **+ Add endpoint**.
        - For the **Endpoint URL**, use `http://localhost:9002/api/stripe/webhook` for local testing.
        - For **Events to send**, click `+ Select events` and add `account.updated` and `checkout.session.completed`.
        - After creation, find the **Signing secret** for the new webhook.
    - **Step 3: Update `.env`:**
        ```env
        # The public URL of your deployed application.
        # For local development, this should match your dev server port.
        NEXT_PUBLIC_APP_URL=http://localhost:9002

        # Your platform's Stripe keys (use test keys for development).
        STRIPE_SECRET_KEY=sk_test_...
        STRIPE_WEBHOOK_SECRET=whsec_...
        ```

4.  **Configure Admin Emails (Optional):**
    - The `.env` file can specify which emails are automatically assigned the 'admin' role on signup.
    ```env
    # To use multiple, separate them with commas: admin1@example.com,superadmin@example.com
    NEXT_PUBLIC_ADMIN_EMAILS=hello@hmperform.com
    ```

### Security Rules (Firestore & Storage)

Deploy the security rules located in `firestore.rules` and `storage.rules` to your Firebase project. These rules are crucial for controlling access to your data.
Use the Firebase CLI:
```bash
firebase deploy --only firestore,storage
```

### Installation

```bash
npm install
```

### Running the Development Server

```bash
npm run dev
```
The application will be available at `http://localhost:9002`.

### Profile Picture Upload Troubleshooting (One-Time Setup)

If you get a CORS or `404 Not Found` error when uploading images, you must configure your Cloud Storage bucket from the command line. This is most often caused by the `gcloud` tool not being authenticated with the correct Google account.

**Follow these steps exactly in the Firebase Studio Terminal:**

1.  **Log in to Google Cloud:** This will open a browser window for you to log in with the Google account associated with your Firebase project.
    ```bash
    gcloud auth login
    ```

2.  **Set the Correct Project:** Explicitly tell `gcloud` to use your project ID.
    ```bash
    gcloud config set project sessionsync-wbo8u
    ```

3.  **Apply the CORS Configuration:** This command uses the correct bucket name for your project.
    ```bash
    gcloud storage buckets update gs://sessionsync-wbo8u.appspot.com --cors-file=cors.json
    ```

This process ensures you are logged into the correct account and targeting the correct project, which should resolve the upload errors permanently.
