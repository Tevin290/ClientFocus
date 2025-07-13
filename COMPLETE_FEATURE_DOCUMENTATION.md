# ClientFocus - Complete Feature Documentation

## Table of Contents
1. [Platform Overview](#platform-overview)
2. [User Roles & Permissions](#user-roles--permissions)
3. [Authentication & Signup Flows](#authentication--signup-flows)
4. [Platform Administrator Features](#platform-administrator-features)
5. [Company Administrator Features](#company-administrator-features)
6. [Coach Features](#coach-features)
7. [Client Features](#client-features)
8. [White-Label & Multi-Tenant Features](#white-label--multi-tenant-features)
9. [Billing & Stripe Integration](#billing--stripe-integration)
10. [Onboarding Tours](#onboarding-tours)
11. [Settings & Configuration](#settings--configuration)
12. [Navigation & URL Structure](#navigation--url-structure)
13. [Security Features](#security-features)

---

## Platform Overview

ClientFocus is a multi-tenant coaching platform that enables coaching companies to operate as isolated SaaS platforms with their own branding, users, and billing systems. Each company gets:

- **White-label URLs**: `yourdomain.com/company-slug`
- **Custom branding**: Logo, colors, and company name
- **Isolated data**: Complete separation between companies
- **Role-based access**: Different permissions for different user types
- **Integrated billing**: Stripe Connect for payment processing
- **Interactive onboarding**: Guided tours for all user types

---

## User Roles & Permissions

### 1. **Super Admin (Platform Admin)**
- **Purpose**: Platform-wide administration and company management
- **Access**: Full platform access across all companies
- **Created by**: Developer directly in database (cannot be created through signup)
- **Login URL**: `/login` (platform login only)
- **Special Permissions**:
  - Create, edit, and delete companies
  - Manage users across all companies
  - Access global analytics and metrics
  - Platform-level billing and settings

### 2. **Admin (Company Admin)**
- **Purpose**: Company-level administration and management
- **Access**: Full access within their assigned company only
- **Created by**: Super admin assignment or company signup with matching admin email
- **Login URL**: `/company-slug/login` or `/login`
- **Special Permissions**:
  - Manage company coaches and sessions
  - Set up Stripe Connect billing
  - Configure company branding
  - Review and approve sessions

### 3. **Coach**
- **Purpose**: Coaching professionals who conduct sessions
- **Access**: Coach features within their assigned company only
- **Created by**: Company signup process
- **Login URL**: `/company-slug/login`
- **Requirements**: Must belong to a company (enforced by business rules)
- **Special Permissions**:
  - Log coaching sessions
  - Manage assigned clients
  - View personal performance metrics

### 4. **Client**
- **Purpose**: Individuals receiving coaching services
- **Access**: Client features and session history within their company
- **Created by**: Company signup process (must select a coach)
- **Login URL**: `/company-slug/login`
- **Requirements**: Must have an assigned coach (enforced by business rules)
- **Special Permissions**:
  - View session history and notes
  - Access coach information

---

## How to Create Each Role - Step-by-Step Guide

### **1. Creating Super Admin (Platform Admin)**

**⚠️ IMPORTANT**: Super Admin accounts can ONLY be created by developers directly in the database. This is a security feature.

#### **Method: Direct Database Creation**
1. **Access Firestore Console**:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Select your project
   - Navigate to "Firestore Database"

2. **Create User Document**:
   - Go to the `users` collection
   - Click "Add Document"
   - Use the user's Firebase Auth UID as the Document ID
   - Add the following fields:
     ```json
     {
       "email": "admin@yourdomain.com",
       "displayName": "Platform Administrator",
       "role": "super-admin",
       "createdAt": [Current Timestamp],
       "companyId": null
     }
     ```

3. **Verify Creation**:
   - User can now log in at `/login`
   - Will be automatically redirected to `/admin/dashboard`
   - Has access to all platform features

#### **Criteria for Super Admin**:
- ✅ Must be manually created by developer
- ✅ Email must be pre-approved
- ✅ No company association required
- ✅ Cannot be created through any signup process
- ✅ Full platform access across all companies

---

### **2. Creating Company Admin**

#### **Method A: Super Admin Assignment (Recommended)**

1. **Login as Super Admin**:
   - Go to `/login`
   - Enter super admin credentials

2. **Navigate to Companies**:
   - Go to `/admin/companies`
   - Click "Create New Company" or edit existing company

3. **Set Admin Email**:
   - In the company form, set the "Admin Email" field
   - This email becomes authorized to register as admin
   - Save the company

4. **Admin Registration**:
   - Share the company signup URL: `/company-slug/signup`
   - Admin user visits signup page
   - Enters the exact email address set in company settings
   - Selects "Admin" role (only visible if email matches)
   - Completes registration

#### **Method B: Direct Company Signup**

1. **Company Must Exist**:
   - Company must be created by super admin first
   - Admin email must be set in company settings

2. **Admin Signup Process**:
   - Visit `/company-slug/signup`
   - Fill out registration form:
     - **Full Name**: Required
     - **Email**: Must match company's adminEmail exactly
     - **Role**: Select "Admin" (only appears if email matches)
     - **Password**: Create secure password
     - **Confirm Password**: Must match
   - Submit form

3. **Automatic Assignment**:
   - System validates email against company admin email
   - User gets admin role and company assignment
   - Redirected to `/admin/dashboard`

#### **Criteria for Company Admin**:
- ✅ Email must match company's `adminEmail` field exactly
- ✅ Company must exist before admin can be created
- ✅ Can use either platform login `/login` or company login `/company-slug/login`
- ✅ Automatically assigned to specific company
- ✅ Admin role only appears in dropdown if email matches

---

### **3. Creating Coach**

#### **Method: Company Signup Process**

1. **Company Must Exist**:
   - Company must be created by super admin
   - Company must have active signup enabled

2. **Coach Registration**:
   - Visit company signup: `/company-slug/signup`
   - Fill out registration form:
     - **Full Name**: Coach's professional name
     - **Email**: Unique email address
     - **Role**: Select "Coach"
     - **Password**: Create secure password
     - **Confirm Password**: Must match
   - Submit form

3. **Automatic Assignment**:
   - Coach is automatically assigned to the company
   - Redirected to `/coach/dashboard`
   - Can immediately start logging sessions

4. **Post-Creation Setup**:
   - Coach should complete profile in `/coach/settings`
   - Add professional credentials and bio
   - Set coaching preferences
   - Upload professional photo

#### **Alternative: Admin Creation (Future Feature)**

1. **Admin Can Invite**:
   - Company admin can send coach invitations
   - Invitation includes signup link and role pre-selection
   - Coach completes registration with pre-assigned role

#### **Criteria for Coach**:
- ✅ Any email address (no restrictions)
- ✅ Must belong to a company (automatically assigned during signup)
- ✅ No coach selection required (coaches don't need coaches)
- ✅ Immediately active after registration
- ✅ Can start logging sessions right away

---

### **4. Creating Client**

#### **Method: Company Signup with Coach Selection**

1. **Prerequisites**:
   - Company must exist
   - At least one coach must be registered in the company
   - Company signup must be enabled

2. **Client Registration**:
   - Visit company signup: `/company-slug/signup`
   - Fill out registration form:
     - **Full Name**: Client's name
     - **Email**: Unique email address
     - **Role**: Select "Client"
     - **Select Your Coach**: Choose from available coaches in the company
     - **Password**: Create secure password
     - **Confirm Password**: Must match
   - Submit form

3. **Coach Selection Process**:
   - Dropdown shows all active coaches in the company
   - Client must select a coach (required field)
   - Coach assignment is permanent (admin can change later)

4. **Automatic Assignment**:
   - Client assigned to selected coach
   - Client assigned to company
   - Redirected to `/client/dashboard`

5. **Post-Creation**:
   - Client can view session history as coach adds sessions
   - Can update profile and preferences
   - Can access coaching materials and notes

#### **Coach Assignment Rules**:
- **Required**: Client must have a coach (enforced by system)
- **Selection**: Client chooses during signup
- **Visibility**: Only coaches from the same company appear
- **Changes**: Only company admin can reassign coaches later

#### **Criteria for Client**:
- ✅ Any email address (no restrictions)
- ✅ Must select an available coach during signup
- ✅ Coach must exist in the same company
- ✅ Automatically assigned to company through coach relationship
- ✅ Cannot signup without selecting a coach

---

## Role Creation Summary Table

| Role | Where to Create | Who Can Create | Requirements | Login URL |
|------|----------------|----------------|--------------|-----------|
| **Super Admin** | Firestore Console | Developer Only | Manual DB entry | `/login` |
| **Company Admin** | `/company-slug/signup` | Self-registration | Email matches company adminEmail | `/login` or `/company-slug/login` |
| **Coach** | `/company-slug/signup` | Self-registration | Company must exist | `/company-slug/login` |
| **Client** | `/company-slug/signup` | Self-registration | Must select coach | `/company-slug/login` |

## Business Rules Enforcement

### **Automatic Validations**:
- ✅ **Clients must have coaches**: System prevents client creation without coach selection
- ✅ **Coaches must have companies**: System automatically assigns company during signup
- ✅ **Admins must match email**: Only matching emails can select admin role
- ✅ **Super admins cannot be created via signup**: Blocked at system level
- ✅ **Company isolation**: Users can only access their assigned company data

### **Database-Level Rules**:
- ✅ **Firestore security rules** enforce all business logic
- ✅ **Cross-company access prevention** at query level
- ✅ **Role validation** on all data operations
- ✅ **Company assignment validation** for coaches and admins

---

## Authentication & Signup Flows

### Platform Administrator Access

#### **Platform Login** (`/login`)
- **URL**: `https://yourdomain.com/login`
- **Access**: Super admins only
- **Features**:
  - Email and password authentication
  - Email validation for admin access
  - Automatic redirect to `/admin/dashboard`
  - Restricted to pre-approved admin emails

#### **Platform Signup** (`/signup`)
- **URL**: `https://yourdomain.com/signup`
- **Access**: Super admins only (highly restricted)
- **Purpose**: Platform administrator account creation
- **Features**:
  - Full name and email registration
  - Password creation with confirmation
  - Automatic super-admin role assignment
  - Immediate redirect to admin dashboard

### Company-Specific Access

#### **Company Landing Page** (`/company-slug`)
- **URL**: `https://yourdomain.com/company-slug`
- **Access**: Public (anyone can view)
- **Features**:
  - **Company Branding**: Logo, colors, and custom styling
  - **Hero Section**: Professional company presentation
  - **Feature Showcase**: Platform capabilities and benefits
  - **Navigation Header**: Sign in and signup buttons
  - **Call-to-Action Sections**: Encouraging user registration
  - **Responsive Design**: Optimized for all device sizes

#### **Company Login** (`/company-slug/login`)
- **URL**: `https://yourdomain.com/company-slug/login`
- **Access**: Existing company users (admin, coach, client)
- **Features**:
  - **White-Label Branding**: Company-specific styling and colors
  - **Email/Password Authentication**: Standard login form
  - **Remember Me**: Persistent login sessions
  - **Link to Signup**: Easy registration access
  - **Role-Based Redirection**: Automatic routing to appropriate dashboard
  - **Error Handling**: Clear feedback for login issues

#### **Company Signup** (`/company-slug/signup`)
- **URL**: `https://yourdomain.com/company-slug/signup`
- **Access**: Anyone wanting to join the specific company
- **Features**:
  - **Full Registration Form**: Name, email, password, role
  - **Role Selection**: Admin, Coach, or Client options
  - **Coach Selection**: Required for client signups
  - **Business Rule Validation**: Enforced constraints
  - **Company Branding**: Consistent visual experience
  - **Success Redirection**: Automatic routing after registration

### **User Role Selection Logic**
- **Admin Role**: Only available if email matches `company.adminEmail`
- **Coach Role**: Available to anyone, automatically assigned to company
- **Client Role**: Available to anyone, must select an available coach
- **Super Admin**: Cannot be created through any signup process

### **Business Rules Enforcement**
- Clients must have a coach assigned during signup
- Coaches and admins must belong to a company
- Super admin accounts can only be created by developers
- Email validation prevents unauthorized admin access

---

## Platform Administrator Features

### **Platform Admin Dashboard** (`/admin/dashboard`)
- **Purpose**: High-level platform oversight and management
- **Key Features**:
  - **Global Metrics**: Sessions across all companies, total active coaches, platform-wide pending reviews
  - **Cross-Company Analytics**: Monthly session trends with company filtering
  - **Performance Charts**: Visual representation of platform growth
  - **Quick Actions**: Direct access to company and user management
  - **Real-Time Data**: Live updates of platform statistics

### **Company Management** (`/admin/companies`)
- **Purpose**: Complete company lifecycle management
- **Features**:
  - **Company Creation**:
    - Company name and URL slug configuration
    - Admin email assignment
    - Initial branding setup (logo, colors)
    - Automatic database record creation
  - **Company Editing**:
    - Update all company information
    - Modify branding elements (logo upload, color picker)
    - Change admin email assignments
    - Real-time preview of changes
  - **Company Deletion**:
    - Safe deletion with confirmation dialogs
    - Associated data cleanup
    - User notification handling
  - **Branding Management**:
    - Logo upload and management
    - Color scheme customization (primary, secondary, background, text)
    - Real-time branding preview
    - Default theme fallback options

### **Global User Management** (`/admin/users`)
- **Purpose**: Cross-company user administration
- **Features**:
  - **User Directory**: Complete list of all platform users
  - **Advanced Filtering**: Search by name, email, role, or company
  - **Role Management**: Change user roles with validation
  - **Company Assignment**: Move users between companies
  - **User Details**: View complete user profiles and activity
  - **Bulk Operations**: Mass user management capabilities
  - **Account Deletion**: Remove users with data cleanup

### **Platform Session Management** (`/admin/sessions`)
- **Purpose**: Cross-company session oversight and review
- **Features**:
  - **Global Session View**: All sessions across all companies
  - **Advanced Filtering**: By company, coach, status, or date
  - **Bulk Review Operations**: Approve/reject multiple sessions
  - **Session Details**: Complete session information and notes
  - **Status Management**: Update session statuses globally
  - **Analytics Integration**: Session performance metrics

### **Platform Companies Overview**
- **Purpose**: High-level company performance monitoring
- **Features**:
  - **Company Grid**: Visual overview of all companies
  - **Performance Metrics**: Sessions, revenue, and growth per company
  - **Health Indicators**: Active users, session frequency, billing status
  - **Quick Actions**: Direct access to company management
  - **Trend Analysis**: Company growth and performance patterns

---

## Company Administrator Features

### **Company Admin Dashboard** (`/admin/dashboard`)
- **Purpose**: Company-specific management and oversight
- **Key Features**:
  - **Company Information Card**: 
    - Company name, slug, and public URL
    - Admin email and contact information
    - Direct link to company landing page
    - Company branding preview
  - **Company Metrics**:
    - Sessions this month with growth percentage
    - Active coaches and client count
    - Pending sessions requiring review
    - Revenue and billing statistics
  - **Performance Analytics**:
    - Monthly session trends with coach filtering
    - Visual charts and graphs
    - Comparative month-over-month analysis
    - Coach performance breakdowns
  - **Management Shortcuts**:
    - Quick access to coach management
    - Direct billing and Stripe setup
    - Session review queue
    - Settings and configuration

### **Coach Management** (`/admin/coaches`)
- **Purpose**: Company coach administration and oversight
- **Features**:
  - **Coach Directory**: All coaches within the company
  - **Performance Metrics**: Sessions, clients, and productivity per coach
  - **Coach Details**: Individual coach profiles and statistics
  - **Client Assignments**: Manage coach-client relationships
  - **Activity Tracking**: Coach login and session activity
  - **Performance Analytics**: Coach comparison and trends

### **Session Review & Management** (`/admin/sessions`)
- **Purpose**: Company session oversight and approval workflow
- **Features**:
  - **Session Queue**: All company sessions with filtering
  - **Review Workflow**: 
    - Approve sessions for billing
    - Request modifications or additional information
    - Reject sessions with feedback
    - Add administrative notes
  - **Session Details**: Complete session information including:
    - Coach and client information
    - Session date, duration, and type
    - Detailed session notes and summaries
    - Attached files and recordings
  - **Bulk Operations**: Mass approve/reject capabilities
  - **Status Tracking**: Session workflow management

### **Billing & Payment Management** (`/admin/billing`)
- **Purpose**: Complete Stripe Connect integration and payment setup
- **Features**:
  - **Stripe Account Connection**:
    - OAuth-based Stripe account linking
    - Support for both test and live modes
    - Account verification and onboarding status
    - Direct access to Stripe dashboard
  - **Products & Services Management**:
    - Create coaching service offerings
    - Define service descriptions and categories
    - Manage service availability and visibility
    - Archive or activate services
  - **Pricing Management**:
    - Set prices for different services
    - Multiple currency support (USD, EUR, GBP, CAD)
    - One-time and recurring pricing options
    - Price history and change tracking
  - **Billing Overview**:
    - Revenue tracking and analytics
    - Payment method management
    - Invoice generation and delivery
    - Failed payment handling

### **Company Settings** (`/admin/settings`)
- **Purpose**: Company configuration and customization
- **Features**:
  - **Company Profile**:
    - Update company information
    - Change admin email assignments
    - Modify company description
  - **Branding Customization**:
    - Logo upload and management
    - Color scheme configuration
    - Preview changes in real-time
    - Reset to default branding options
  - **User Management Settings**:
    - Default role assignments
    - User invitation processes
    - Access permissions configuration
  - **Notification Settings**:
    - Email notification preferences
    - Session review alerts
    - Billing and payment notifications

---

## Coach Features

### **Coach Dashboard** (`/coach/dashboard`)
- **Purpose**: Personal coaching performance and quick session management
- **Key Features**:
  - **Company Connection Display**:
    - Company name and branding
    - Company public URL for easy sharing
    - Coach role confirmation
    - Company contact information
  - **Personal Performance Metrics**:
    - Sessions completed this month with growth trends
    - Active client count and engagement levels
    - Personal performance compared to previous months
    - Achievement indicators and milestones
  - **Quick Action Center**:
    - **One-Click Session Logging**: Direct access to session creation
    - **Recent Sessions**: Last 5 sessions with quick edit access
    - **Upcoming Sessions**: Scheduled sessions (when implemented)
    - **Client Quick Access**: Fast navigation to client management
  - **Analytics & Insights**:
    - 6-month session history with full/half session breakdown
    - Client engagement patterns
    - Session frequency trends
    - Performance goal tracking

### **Session Logging** (`/coach/log-session`)
- **Purpose**: Comprehensive session documentation and management
- **Features**:
  - **Session Creation Form**:
    - Client selection from assigned clients
    - Session date and time selection
    - Session type (Full Session, Half Session, Consultation)
    - Session duration tracking
  - **Session Documentation**:
    - Detailed session notes with rich text editing
    - Goals and objectives tracking
    - Client progress observations
    - Action items and follow-up tasks
  - **File Management**:
    - Upload session recordings and materials
    - Attach relevant documents and resources
    - Image and video support
    - File organization and categorization
  - **AI Integration** (if enabled):
    - Automatic session note summarization
    - Key insight extraction
    - Action item identification
  - **Session Status Management**:
    - Submit for review
    - Save as draft
    - Mark as completed
    - Request approval workflow

### **Session Management** (`/coach/my-sessions`)
- **Purpose**: Complete session history and editing capabilities
- **Features**:
  - **Session Library**:
    - Comprehensive list of all coach sessions
    - Advanced filtering by client, date, status, or type
    - Search functionality for quick session finding
    - Sorting options (date, client, status, duration)
  - **Session Editing**:
    - Modify session details and notes
    - Update session status and outcomes
    - Add additional files or recordings
    - Correct session information
  - **Status Tracking**:
    - Visual indicators for session approval status
    - Review feedback and comments
    - Approval workflow tracking
    - Billing status monitoring
  - **Analytics Integration**:
    - Session performance metrics
    - Client progress tracking over time
    - Session outcome analysis
    - Performance trend visualization

### **Client Management** (`/coach/my-clients`)
- **Purpose**: Comprehensive client relationship and progress management
- **Features**:
  - **Client Directory**:
    - All assigned clients with profile information
    - Client contact details and preferences
    - Assignment date and relationship duration
    - Client activity and engagement levels
  - **Individual Client Profiles**:
    - Complete client information and history
    - Session history and progress tracking
    - Goals and objectives management
    - Notes and observations
  - **Client Session History**:
    - Per-client session chronology
    - Progress tracking and milestone achievement
    - Session outcomes and effectiveness
    - Client feedback and satisfaction
  - **Communication Management**:
    - Client interaction logs
    - Follow-up task management
    - Appointment scheduling (when implemented)
    - Client preference tracking

### **Coach Settings** (`/coach/settings`)
- **Purpose**: Personal and professional configuration
- **Features**:
  - **Professional Profile**:
    - Update personal information and bio
    - Professional credentials and certifications
    - Coaching specializations and expertise
    - Profile photo and contact preferences
  - **Notification Preferences**:
    - Session approval notifications
    - Client assignment alerts
    - System update notifications
    - Email frequency settings
  - **Coaching Preferences**:
    - Default session types and durations
    - Preferred coaching methodologies
    - Availability and scheduling preferences
    - Session documentation templates

---

## Client Features

### **Client Dashboard** (`/client/dashboard`)
- **Purpose**: Personal coaching journey overview and navigation
- **Key Features**:
  - **Welcome & Personalization**:
    - Personalized greeting with client name
    - Coaching journey overview
    - Progress indicators and milestones
    - Motivational messaging and encouragement
  - **Quick Access Navigation**:
    - **Session History**: Direct access to all past sessions
    - **Upcoming Features Preview**: Information about planned functionality
    - **Coach Information**: Details about assigned coach
    - **Progress Tracking**: Visual representation of coaching journey
  - **Recent Activity**:
    - Latest session summaries
    - Recent goal achievements
    - Coach feedback and recommendations
    - Upcoming session reminders (when implemented)

### **Session History** (`/client/history`)
- **Purpose**: Complete access to coaching session records and progress
- **Features**:
  - **Session Chronicle**:
    - Chronological list of all coaching sessions
    - Session details including date, duration, and type
    - Coach notes and session summaries
    - Session outcomes and progress indicators
  - **Session Details View**:
    - Complete session information and notes
    - Goals addressed and achievements
    - Action items and follow-up tasks
    - Session recordings and materials (when available)
  - **Progress Visualization**:
    - Visual timeline of coaching journey
    - Goal achievement tracking
    - Progress charts and metrics
    - Milestone celebration and recognition
  - **Search & Filtering**:
    - Find sessions by date, topic, or coach
    - Filter by session type or outcomes
    - Search session notes and content
    - Export session data and reports

### **Client Settings** (`/client/settings`)
- **Purpose**: Personal account and preference management
- **Features**:
  - **Profile Management**:
    - Update personal information and contact details
    - Profile photo and communication preferences
    - Emergency contact information
    - Personal coaching goals and objectives
  - **Privacy & Security**:
    - Account security settings
    - Data sharing preferences
    - Privacy controls for session information
    - Account deletion and data export options
  - **Communication Preferences**:
    - Notification settings and frequency
    - Preferred communication methods
    - Session reminder preferences
    - Coach communication guidelines
  - **Coaching Preferences**:
    - Session type preferences
    - Goal tracking and milestone settings
    - Progress sharing options
    - Feedback and evaluation preferences

---

## White-Label & Multi-Tenant Features

### **Complete Brand Isolation**
- **Custom URLs**: Each company operates under `/company-slug` structure
- **Dynamic Branding**: Automatic application of company colors, logos, and styling
- **Page Title Customization**: Company name in browser tabs and bookmarks
- **Favicon Integration**: Company logo as browser icon
- **Default Theme Fallback**: Professional default styling when custom branding isn't set

### **Multi-Tenant Architecture**
- **Data Isolation**: Complete separation of company data in Firestore
- **Role-Based Security**: Users can only access their company's information
- **Business Rule Enforcement**: Database-level validation of company associations
- **Cross-Company Prevention**: Middleware and security rules prevent data leakage

### **Company Landing Pages**
- **Professional Presentation**: Marketing-focused company showcases
- **SEO Optimization**: Meta tags and structured data for search visibility
- **Lead Generation**: Contact forms and signup conversion optimization
- **Responsive Design**: Mobile-optimized for all device types

### **White-Label User Experience**
- **Isolated Navigation**: Company-specific menu items and routing
- **Branded Communications**: All emails and notifications use company branding
- **Custom Messaging**: Company-specific copy and content throughout
- **Independent Configuration**: Per-company settings and preferences

### **CompanyLayout System**
The `CompanyLayout` component provides:
- **Automatic Branding Application**: CSS variable injection for colors
- **Company Information Loading**: Dynamic company data fetching
- **Error Handling**: Graceful fallbacks for missing companies
- **Loading States**: Professional loading indicators
- **Header/Footer Customization**: Company-specific navigation elements

---

## Billing & Stripe Integration

### **Stripe Connect Architecture**
- **Multi-Tenant Payment Processing**: Each company has independent Stripe account
- **Platform Integration**: Seamless connection to main platform account
- **OAuth-Based Setup**: Secure account linking through Stripe OAuth
- **Test/Live Mode Support**: Complete development and production workflow

### **Company Account Setup**
1. **Initial Connection**:
   - Admin initiates Stripe Connect OAuth flow
   - Secure authorization through Stripe's interface
   - Automatic account creation and linking
   - Return to platform with connection confirmation

2. **Account Onboarding**:
   - Complete Stripe Express account setup
   - Business information and verification
   - Banking details and tax information
   - Account activation and approval

3. **Integration Completion**:
   - Webhook configuration for real-time updates
   - Account status monitoring and alerts
   - Test transaction validation
   - Production readiness verification

### **Products & Services Management**
- **Service Definition**:
  - Create coaching service offerings with detailed descriptions
  - Category and type classification
  - Service duration and format specifications
  - Availability and booking configuration

- **Pricing Configuration**:
  - Flexible pricing models (one-time, recurring, tiered)
  - Multiple currency support (USD, EUR, GBP, CAD)
  - Special pricing and discount management
  - Dynamic pricing based on service parameters

- **Product Catalog**:
  - Visual product showcase for clients
  - Service comparison and selection tools
  - Pricing transparency and clarity
  - Package and bundle offerings

### **Payment Processing Workflow**
1. **Client Setup**: Payment method configuration through Stripe Checkout
2. **Session Billing**: Automatic billing for approved sessions
3. **Invoice Generation**: Automated invoice creation and delivery
4. **Payment Collection**: Secure payment processing and confirmation
5. **Revenue Distribution**: Automatic transfers to company accounts

### **Financial Reporting & Analytics**
- **Revenue Tracking**: Real-time revenue monitoring and analytics
- **Payment Method Analysis**: Payment success rates and method preferences
- **Client Payment Behavior**: Payment timing and frequency patterns
- **Financial Forecasting**: Revenue projection and growth analysis

---

## Onboarding Tours

### **React Joyride Integration**
- **Professional Tour Experience**: Smooth, interactive guidance system
- **Role-Specific Content**: Customized tours for different user types
- **Progress Tracking**: Automatic saving of tour completion status
- **Flexible Control**: Skip, replay, or pause tours at any time

### **Admin Onboarding Tour**
**Tour Steps**:
1. **Platform Welcome**: Introduction to admin dashboard and responsibilities
2. **Company Information**: Explanation of company details and public URL sharing
3. **Key Metrics Overview**: Understanding performance indicators and analytics
4. **Session Analytics**: Detailed explanation of charts and filtering options
5. **Management Tools**: Overview of coach management, billing, and administrative functions
6. **Navigation Guide**: Complete sidebar and menu system explanation

**Learning Objectives**:
- Understand admin responsibilities and capabilities
- Learn to interpret company performance metrics
- Master the session review and approval process
- Configure billing and payment systems
- Navigate the complete admin interface efficiently

### **Coach Onboarding Tour**
**Tour Steps**:
1. **Coach Platform Welcome**: Introduction to coaching dashboard and tools
2. **Company Association**: Understanding company connection and public page
3. **Performance Metrics**: Personal coaching statistics and growth tracking
4. **Session Logging**: Quick session creation and documentation process
5. **Session History**: Understanding analytics and performance charts
6. **Navigation Overview**: Complete coach feature and menu explanation

**Learning Objectives**:
- Efficiently log and manage coaching sessions
- Understand personal performance metrics and trends
- Navigate client management and communication tools
- Utilize analytics for coaching improvement
- Master the complete coach workflow

### **Client Onboarding Tour**
**Tour Steps**:
1. **Client Welcome**: Platform introduction and coaching journey explanation
2. **Session History Access**: How to view and navigate past sessions
3. **Feature Preview**: Information about upcoming platform enhancements
4. **Navigation Guide**: Client menu and available options explanation

**Learning Objectives**:
- Access and review session history effectively
- Understand coaching progress and goal tracking
- Navigate available features and settings
- Prepare for upcoming platform enhancements

### **Tour Customization & Management**
- **Contextual Help**: Relevant information for each interface element
- **Visual Highlighting**: Clear indication of important features and buttons
- **Responsive Design**: Tours work seamlessly across all device sizes
- **Accessibility Support**: Keyboard navigation and screen reader compatibility
- **Multi-Language Support**: Internationalization ready for global deployment

---

## Settings & Configuration

### **Global Platform Settings** (Super Admin)
- **System Configuration**: Platform-wide operational parameters
- **Security Policies**: Authentication rules and access controls
- **Feature Management**: Enable/disable platform capabilities
- **Integration Settings**: Third-party service configuration and API management

### **Company-Level Settings** (Company Admin)
- **Branding Management**: 
  - Logo upload and positioning
  - Color scheme configuration (primary, secondary, background, text)
  - Typography and font selections
  - Custom CSS and styling overrides

- **Operational Settings**:
  - Default user roles and permissions
  - Session approval workflows
  - Billing and payment configurations
  - Communication and notification rules

- **Business Configuration**:
  - Company information and contact details
  - Service offerings and pricing structures
  - User onboarding and registration settings
  - Data retention and privacy policies

### **Personal Settings** (All Users)
- **Profile Management**:
  - Personal information and contact details
  - Professional credentials and bio
  - Profile photo and avatar settings
  - Communication preferences and availability

- **Privacy & Security**:
  - Password management and security settings
  - Two-factor authentication configuration
  - Data sharing and privacy controls
  - Account deletion and data export

- **Notification Controls**:
  - Email notification preferences
  - In-app alert settings
  - Mobile push notification management
  - Communication frequency controls

### **Theme & Appearance**
- **Light/Dark Mode Toggle**: System preference detection with manual override
- **Company Branding Application**: Automatic brand color integration
- **Responsive Design**: Optimized layouts for desktop, tablet, and mobile
- **Accessibility Features**: High contrast modes, font size controls, keyboard navigation

---

## Navigation & URL Structure

### **Platform Administrator URLs**
```
/login                  - Platform administrator login
/signup                 - Platform administrator registration
/admin/dashboard        - Platform overview and metrics
/admin/companies        - Company management and creation
/admin/users           - Global user management
/admin/sessions        - Cross-company session review
/admin/settings        - Platform configuration
```

### **Company Administrator URLs**
```
/admin/dashboard        - Company overview and metrics
/admin/coaches          - Company coach management
/admin/sessions         - Company session review
/admin/billing          - Stripe Connect and pricing
/admin/settings         - Company configuration
```

### **Coach URLs**
```
/coach/dashboard        - Coach performance and overview
/coach/log-session      - Session creation and logging
/coach/my-sessions      - Session history and management
/coach/my-clients       - Client relationship management
/coach/settings         - Coach preferences and profile
```

### **Client URLs**
```
/client/dashboard       - Client journey overview
/client/history         - Session history and records
/client/settings        - Client preferences and account
```

### **Company-Specific URLs**
```
/company-slug           - Public company landing page
/company-slug/login     - Company user authentication
/company-slug/signup    - Company user registration
```

### **API Endpoints**
```
/api/stripe/webhook     - Stripe event processing
/api/stripe/connect/callback - OAuth return handling
```

### **Navigation Patterns**
- **Role-Based Menus**: Dynamic sidebar based on user permissions
- **Breadcrumb Navigation**: Clear path indication for complex workflows
- **Quick Actions**: One-click access to frequently used features
- **Search Integration**: Global search across relevant data
- **Responsive Navigation**: Mobile-optimized menu systems

---

## Security Features

### **Authentication & Authorization**
- **Firebase Authentication**: Industry-standard user authentication
- **Role-Based Access Control**: Granular permission system with four distinct roles
- **Session Management**: Secure session handling and automatic expiration
- **Password Security**: Strong password requirements and secure storage

### **Multi-Tenant Data Security**
- **Complete Data Isolation**: Firestore security rules prevent cross-company access
- **Business Rule Enforcement**: Database-level validation of user-company associations
- **Query-Level Security**: Company-scoped data queries for all operations
- **Audit Logging**: Comprehensive activity tracking and monitoring

### **Payment & Financial Security**
- **Stripe PCI Compliance**: All payment processing through Stripe's secure infrastructure
- **Webhook Verification**: Cryptographic signature validation for all webhook events
- **Financial Data Protection**: No sensitive financial information stored locally
- **Fraud Prevention**: Integration with Stripe's advanced fraud detection

### **Application Security**
- **Input Validation**: Comprehensive data validation and sanitization
- **XSS Prevention**: Content Security Policy and input escaping
- **CSRF Protection**: Request validation and token-based protection
- **SQL Injection Prevention**: Parameterized queries and ORM protection

### **Infrastructure Security**
- **HTTPS Enforcement**: All traffic encrypted in transit
- **Security Headers**: Comprehensive security header implementation
- **Environment Isolation**: Separate development, staging, and production environments
- **Access Logging**: Complete audit trail of user actions and system access

### **Privacy & Compliance**
- **Data Minimization**: Collection of only necessary user information
- **User Consent**: Clear consent mechanisms for data collection and processing
- **Data Portability**: User data export capabilities
- **Right to Deletion**: Complete account and data removal options

---

## Quick Start Guide

### **For Platform Administrators**
1. **Initial Setup**: Log in at `/login` with super-admin credentials
2. **Create First Company**: Use `/admin/companies` to set up the first coaching company
3. **Configure Branding**: Upload logo and set company colors
4. **Create Company Admin**: Assign admin email and notify company administrator
5. **Monitor Platform**: Use dashboard analytics to track platform growth

### **For Company Administrators**
1. **First Login**: Access company login at `/company-slug/login`
2. **Complete Profile**: Update company information and branding
3. **Set Up Billing**: Connect Stripe account via `/admin/billing`
4. **Create Services**: Define coaching offerings and pricing
5. **Invite Team**: Share signup link for coaches to join company

### **For Coaches**
1. **Join Company**: Sign up at `/company-slug/signup` and select "Coach" role
2. **Complete Profile**: Add professional information and credentials
3. **Take Onboarding Tour**: Follow interactive guide for platform familiarization
4. **Log First Session**: Use quick action to create initial session record
5. **Monitor Performance**: Track metrics and client engagement

### **For Clients**
1. **Sign Up**: Register at `/company-slug/signup` and select your coach
2. **Explore Dashboard**: Familiarize yourself with available features
3. **Review Sessions**: Access session history and coach notes
4. **Update Profile**: Customize preferences and notification settings
5. **Track Progress**: Monitor coaching journey and goal achievement

---

This comprehensive documentation covers all implemented features, user flows, and system capabilities in the ClientFocus platform. Each section provides detailed information about access patterns, functionality, and user experience for all roles and components.