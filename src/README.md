
# ClientFocus

Streamline your coaching sessions and client management with ClientFocus. This Next.js application leverages Firebase for backend services (Auth, Firestore) and Genkit for AI-powered features.

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
    - This file holds all your secret keys. The necessary placeholders are already included.

2.  **Configure Firebase (CRUCIAL):**
    - The application will not work without these keys.
    - **Step 1: Find your Firebase config:**
        - Go to your [Firebase Console](https://console.firebase.google.com/).
        - Select your project (`sessionsync-wbo8u`).
        - Click the gear icon next to **Project Overview** and select **Project settings**.
        - In the **General** tab, scroll down to the **Your apps** section.
        - Click on your web app (if you don't have one, create one).
        - Select **Config** under the Firebase SDK snippet section.
    - **Step 2: Update your `.env` file:**
        - Copy the values from the Firebase config object and paste them into the corresponding variables in your `.env` file.
        ```env
        NEXT_PUBLIC_FIREBASE_API_KEY=...
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
        NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
        NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
        NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
        NEXT_PUBLIC_FIREBASE_APP_ID=...
        ```

3.  **Configure Stripe (Crucial for Billing):**
    - These variables are for **your platform's** Stripe account. They allow your app to manage connections for your users.
    - **Step 1: Get API Keys:**
        - Log in to your [Stripe Dashboard](https://dashboard.stripe.com).
        - Go to the **Developers** section.
        - Under **API keys**, find your keys.
        - **Important:** You will need your **Secret Key** for both test and live modes.
        - Copy your **Test Secret Key** and paste it into `STRIPE_SECRET_KEY_TEST` in your `.env` file.
        - Toggle to **Live mode** on the Stripe dashboard, and copy your **Live Secret Key** into `STRIPE_SECRET_KEY_LIVE`.
    - **Step 2: Create Webhooks:**
        - In the **Developers** section, go to **Webhooks**.
        - You will need to create **two** endpoints: one for test mode and one for live mode.
        - **Test Webhook:**
            - Make sure the "Test mode" toggle at the top of the Stripe dashboard is **ON**.
            - Click **+ Add endpoint**.
            - Endpoint URL: `http://localhost:9002/api/stripe/webhook` (or your deployed test URL).
            - Events: Add all the recommended events listed below.
            - After creation, copy the **Signing secret** and paste it into `STRIPE_WEBHOOK_SECRET_TEST` in your `.env` file.
        - **Live Webhook:**
            - Make sure the "Test mode" toggle at the top of the Stripe dashboard is **OFF**.
            - Click **+ Add endpoint** again.
            - Endpoint URL: `https://studio--sessionsync-wbo8u.us-central1.hosted.app/api/stripe/webhook`.
            - Events: Add all the recommended events listed below.
            - After creation, copy the **Signing secret** and paste it into `STRIPE_WEBHOOK_SECRET_LIVE` in your `.env` file.
    - **Recommended Webhook Events:**
        - Under `Account`: `account.updated`
        - Under `Checkout`: `checkout.session.completed`
        - Under `Invoice`: `invoice.payment_succeeded`, `invoice.payment_failed`
        - Under `Customer`: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
    - **Step 3: Verify `.env`:**
        - Ensure all Stripe variables (`STRIPE_SECRET_KEY_TEST`, `STRIPE_SECRET_KEY_LIVE`, `STRIPE_WEBHOOK_SECRET_TEST`, `STRIPE_WEBHOOK_SECRET_LIVE`) are filled out.
        - Ensure `NEXT_PUBLIC_APP_URL` is correct. **Do not include a trailing slash.**

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

    
