# ClientFocus Production Deployment Guide

## 🚀 Deployment Options Overview

### **Vercel (Recommended) ⭐**
- ✅ **Best for**: Next.js applications with API routes
- ✅ **Pros**: Zero-config, automatic deployments, excellent Next.js integration, serverless functions
- ✅ **Features**: Built-in CDN, automatic HTTPS, preview deployments, environment variables
- ✅ **Stripe Integration**: Full support for webhook endpoints and API routes
- ⚠️ **Cost**: Free tier available, paid plans for production

### **Firebase Hosting**
- ✅ **Best for**: Static sites, integration with Firebase services
- ✅ **Pros**: Google infrastructure, easy Firebase integration, free tier
- ⚠️ **Limitations**: Static hosting only (no server-side API routes)
- ❌ **Stripe Webhooks**: Requires external service for API endpoints
- 💡 **Note**: You'll need Cloud Functions for Stripe webhooks

### **Quick Recommendation**
**For ClientFocus, use Vercel** because:
1. Full Next.js App Router support
2. API routes work out of the box (essential for Stripe webhooks)
3. Automatic deployments and previews
4. Superior developer experience
5. Environment variable management
6. Built-in performance optimization

---

## Prerequisites

1. **Firebase Project Setup**
   - Create a Firebase project
   - Enable Authentication and Firestore
   - Configure Firebase Authentication providers
   - Set up Firestore security rules

2. **Stripe Account**
   - Create Stripe account
   - Get API keys for test and live modes
   - Set up Stripe Connect for multi-tenant payments

## Environment Variables

Create a `.env.production` file with the following variables:

```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# App Configuration
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Stripe Configuration
STRIPE_CONNECT_CLIENT_ID_TEST=ca_test_xxx
STRIPE_CONNECT_CLIENT_ID_LIVE=ca_live_xxx
STRIPE_SECRET_KEY_TEST=sk_test_xxx
STRIPE_SECRET_KEY_LIVE=sk_live_xxx
```

## Deployment Steps

### 1. Build & Test

```bash
# Install dependencies
npm install

# Run type checking
npm run type-check

# Build for production
npm run build

# Test the production build locally
npm start
```

### 2. Deploy to Vercel (Recommended)

#### **Step-by-Step Vercel Deployment**

1. **Install Vercel CLI**:
```bash
npm i -g vercel
```

2. **Login to Vercel**:
```bash
vercel login
```

3. **Initial Deployment**:
```bash
# In your project directory
vercel

# Follow the prompts:
# Set up and deploy "~/clientfocus"? [Y/n] y
# Which scope do you want to deploy to? [your-team]
# Link to existing project? [y/N] n
# What's your project's name? clientfocus
# In which directory is your code located? ./
```

4. **Configure Environment Variables**:
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Select your project
   - Go to "Settings" > "Environment Variables"
   - Add all required variables:

```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# App Configuration
NEXT_PUBLIC_APP_URL=https://your-vercel-domain.vercel.app

# Stripe Configuration
STRIPE_CONNECT_CLIENT_ID_TEST=ca_test_xxx
STRIPE_CONNECT_CLIENT_ID_LIVE=ca_live_xxx
STRIPE_SECRET_KEY_TEST=sk_test_xxx
STRIPE_SECRET_KEY_LIVE=sk_live_xxx
```

5. **Redeploy with Environment Variables**:
```bash
vercel --prod
```

6. **Configure Custom Domain** (Optional):
   - In Vercel Dashboard > Settings > Domains
   - Add your custom domain
   - Update DNS records as instructed
   - Update `NEXT_PUBLIC_APP_URL` to your custom domain

#### **Vercel Configuration File** (Optional)
Create `vercel.json` in your root directory:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "installCommand": "npm install",
  "regions": ["iad1"],
  "functions": {
    "src/app/api/stripe/webhook/route.ts": {
      "maxDuration": 30
    }
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        }
      ]
    }
  ]
}
```

### 3. Deploy to Other Platforms

#### Netlify
1. Connect GitHub repository
2. Set build command: `npm run build`
3. Set publish directory: `.next`
4. Add environment variables

#### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### 3. Deploy to Firebase Hosting

#### **Step-by-Step Firebase Deployment**

1. **Install Firebase CLI**:
```bash
npm install -g firebase-tools
```

2. **Login to Firebase**:
```bash
firebase login
```

3. **Initialize Firebase in Your Project**:
```bash
# In your project directory
firebase init

# Select the following options:
# ◯ Hosting: Configure files for Firebase Hosting
# ◯ Firestore: Configure security rules and indexes
# ◯ Storage: Configure a security rules file for Cloud Storage

# Use an existing project or create a new one
# Select your Firebase project
```

4. **Configure Firebase Hosting**:
   - When prompted for public directory: enter `.next`
   - Configure as single-page app: `y`
   - Set up automatic builds with GitHub: `n` (we'll build manually)

5. **Update `firebase.json`**:
```json
{
  "hosting": {
    "public": ".next",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**",
        "headers": [
          {
            "key": "X-Frame-Options",
            "value": "DENY"
          },
          {
            "key": "X-Content-Type-Options", 
            "value": "nosniff"
          },
          {
            "key": "Cache-Control",
            "value": "public, max-age=31536000, immutable"
          }
        ]
      }
    ]
  },
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "storage": {
    "rules": "storage.rules"
  }
}
```

6. **Build and Deploy**:
```bash
# Build the Next.js app
npm run build

# Deploy to Firebase
firebase deploy

# Or deploy specific services
firebase deploy --only hosting
firebase deploy --only firestore:rules
firebase deploy --only storage
```

#### **Firebase Environment Configuration**

Since Firebase Hosting is static, you need to configure environment variables differently:

1. **Create `.env.production`**:
```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# App Configuration
NEXT_PUBLIC_APP_URL=https://your-project.web.app

# Stripe Configuration
STRIPE_CONNECT_CLIENT_ID_TEST=ca_test_xxx
STRIPE_CONNECT_CLIENT_ID_LIVE=ca_live_xxx
STRIPE_SECRET_KEY_TEST=sk_test_xxx
STRIPE_SECRET_KEY_LIVE=sk_live_xxx
```

2. **Build with Environment**:
```bash
# Load production environment and build
NODE_ENV=production npm run build
```

#### **Firebase Custom Domain Setup**:

1. **Add Custom Domain**:
```bash
firebase hosting:channel:deploy live --project your-project-id
```

2. **Configure Domain in Firebase Console**:
   - Go to Firebase Console > Hosting
   - Click "Add custom domain"
   - Follow DNS configuration instructions
   - Update `NEXT_PUBLIC_APP_URL` to your custom domain

#### **Firebase Deployment Script**

Create `deploy.sh` script:
```bash
#!/bin/bash

echo "🚀 Starting Firebase deployment..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the project
echo "🔨 Building project..."
NODE_ENV=production npm run build

# Deploy Firestore rules
echo "🔥 Deploying Firestore rules..."
firebase deploy --only firestore:rules

# Deploy storage rules
echo "📁 Deploying Storage rules..."
firebase deploy --only storage

# Deploy hosting
echo "🌐 Deploying to Firebase Hosting..."
firebase deploy --only hosting

echo "✅ Deployment complete!"
echo "🌍 Your app is live at: https://your-project.web.app"
```

Make it executable:
```bash
chmod +x deploy.sh
./deploy.sh
```

## Post-Deployment Configuration

### 1. Firebase Security Rules
Deploy the Firestore rules:
```bash
firebase deploy --only firestore:rules
```

### 2. Domain Configuration
- Update `NEXT_PUBLIC_APP_URL` to your production domain
- Configure CORS settings in Firebase
- Update Stripe webhook endpoints

### 3. Stripe Configuration
- Add production webhook endpoint: `https://yourdomain.com/api/stripe/webhook`
- Update Stripe Connect redirect URIs
- Test Stripe Connect flow in production

### 4. Create Super Admin User
Manually create the first super-admin user in Firestore:

```javascript
// In Firestore console, create user document
{
  email: "admin@yourdomain.com",
  displayName: "Platform Admin", 
  role: "super-admin",
  createdAt: new Date()
}
```

## Security Checklist

- [ ] Firestore security rules deployed
- [ ] Environment variables secured
- [ ] HTTPS enabled
- [ ] Stripe webhook signatures verified
- [ ] CORS properly configured
- [ ] Security headers enabled
- [ ] Console logs removed from production

## Monitoring & Maintenance

### Performance Monitoring
- Enable Next.js Analytics
- Monitor Core Web Vitals
- Set up error tracking (Sentry)

### Database Monitoring
- Monitor Firestore usage
- Set up backup strategy
- Monitor security rules effectiveness

### Stripe Monitoring
- Monitor webhook delivery
- Set up payment failure alerts
- Monitor account connection status

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Check TypeScript errors
   - Verify all dependencies are installed
   - Check Next.js version compatibility

2. **Authentication Issues**
   - Verify Firebase configuration
   - Check domain whitelist in Firebase
   - Verify environment variables

3. **Stripe Connection Issues**
   - Check Stripe API keys
   - Verify webhook endpoints
   - Check Connect application settings

## 📋 Complete Post-Deployment Checklist

### **Firebase Configuration**
- [ ] Firestore security rules deployed (`firebase deploy --only firestore:rules`)
- [ ] Storage security rules deployed (`firebase deploy --only storage`)
- [ ] Authentication providers configured
- [ ] Domain added to authorized domains in Firebase Console
- [ ] Firebase project permissions configured

### **Stripe Configuration**
- [ ] Stripe Connect application created
- [ ] Webhook endpoint added: `https://yourdomain.com/api/stripe/webhook`
- [ ] Webhook events configured (account.updated, checkout.session.completed)
- [ ] Test and live mode API keys configured
- [ ] Connect OAuth redirect URIs updated:
  - `https://yourdomain.com/api/stripe/connect/callback`
- [ ] Platform fee configuration (if applicable)

### **Environment Variables Verification**
- [ ] All Firebase config variables set
- [ ] Stripe API keys configured for both test and live
- [ ] `NEXT_PUBLIC_APP_URL` updated to production domain
- [ ] No sensitive data in client-side variables

### **Application Configuration**
- [ ] First super admin user created in Firestore
- [ ] Company created for testing
- [ ] Test user accounts created (admin, coach, client)
- [ ] Email service configured (if applicable)
- [ ] Analytics and monitoring set up

### **Security Verification**
- [ ] HTTPS enabled and working
- [ ] Security headers implemented
- [ ] CORS properly configured
- [ ] No console logs in production
- [ ] Error handling working properly
- [ ] Rate limiting configured (if applicable)

### **Performance & Monitoring**
- [ ] Core Web Vitals optimized
- [ ] Image optimization working
- [ ] CDN configured properly
- [ ] Error tracking set up (Sentry, LogRocket, etc.)
- [ ] Uptime monitoring configured
- [ ] Performance monitoring enabled

### **Testing Checklist**
- [ ] User registration flow works for all roles
- [ ] Authentication working across all pages
- [ ] Stripe Connect onboarding flow working
- [ ] White-label URLs working (`/company-slug`)
- [ ] Session logging and management working
- [ ] Onboarding tours working
- [ ] Mobile responsiveness verified
- [ ] Cross-browser compatibility tested

### **Business Functionality**
- [ ] Super admin can create companies
- [ ] Company admins can manage their company
- [ ] Coaches can log sessions
- [ ] Clients can view session history
- [ ] Billing and payments working
- [ ] Multi-tenant isolation working
- [ ] Company branding applying correctly

---

## 🛠️ Quick Deploy Commands

### **Vercel Deployment**
```bash
# Quick deploy to Vercel
npm install -g vercel
vercel login
vercel
vercel --prod
```

### **Firebase Deployment**
```bash
# Quick deploy to Firebase
npm install -g firebase-tools
firebase login
firebase init
npm run build
firebase deploy
```

### **Local Testing**
```bash
# Test production build locally
npm run build
npm start
```

---

## 🆘 Common Issues & Solutions

### **Build Failures**
```bash
# Clear cache and rebuild
rm -rf .next node_modules package-lock.json
npm install
npm run build
```

### **Environment Variable Issues**
```bash
# Verify environment variables are loaded
console.log(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID)
```

### **Stripe Webhook Testing**
```bash
# Use Stripe CLI for local webhook testing
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

### **Firebase Rules Issues**
```bash
# Deploy rules with force flag
firebase deploy --only firestore:rules --force
```

---

## 📞 Support Resources

### **Documentation**
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Vercel Documentation](https://vercel.com/docs)
- [Firebase Hosting](https://firebase.google.com/docs/hosting)
- [Stripe Connect](https://stripe.com/docs/connect)

### **Community Support**
- [Next.js GitHub Discussions](https://github.com/vercel/next.js/discussions)
- [Vercel Community](https://github.com/vercel/vercel/discussions)
- [Firebase Community](https://firebase.google.com/support/contact/troubleshooting)
- [Stripe Developer Community](https://support.stripe.com/)

### **Emergency Contacts**
For critical deployment issues:
1. Check platform status pages
2. Review recent deployment logs
3. Rollback to previous working version
4. Contact platform support if needed