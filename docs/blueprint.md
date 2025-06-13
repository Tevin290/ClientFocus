# **App Name**: SessionSync

## Core Features:

- Role Management: Role-based access control: Admin, Coach, and Client roles with differentiated permissions.
- Session Logging: Coach session logging: Input form for coaches to submit session details, including client info, session notes, video links, session type (Full/Half), and summary.
- Session Review: Admin session review: Interface for admins to review submitted sessions and initiate client billing.
- Coach Dashboard: Coach statistics dashboard: Display monthly session counts and relevant statistics for coaches.
- Client Portal: Client session history: Portal for clients to view their session notes, recordings, dates, and session types.
- Stripe Settings: Settings panel for administrators to paste in Stripe keys, and enable test mode.
- Session Summarization: Summarization tool for generating key discussion points from submitted coach notes.

## Style Guidelines:

- Primary Color – Crimson Red: `#C62828` Use for primary buttons, section headers, key highlights, and status badges.
- Accent Color – Neon Yellow-Green: `#D4FF00` Use sparingly to draw attention: CTA buttons, toggles (e.g., Stripe Test Mode), highlights on graphs/stats.
- Background Color – Soft Gray: `#F5F5F5` Keeps interface clean and reduces eye strain.
- Neutral/Dark – Charcoal Gray: `#2C2C2C` For primary text, nav items, and dashboard labels for a clean contrast.
- Panel / Card Background – White: `#FFFFFF` Use for content modules like session logs, client details, forms.
- Confirmation/Success – Soft Green: `#81C784` Used for submission success, payment confirmation, or progress feedback.
- Font: `Poppins` A modern, geometric sans-serif that feels clean and bold—great for dashboards.
- Headlines: `600–700 weight`
- Subheadings / Buttons: `500`
- Body Text: `400`
- Small UI Labels: `300–400`, uppercase where appropriate
- Headline: `28–32px`
- Subhead: `20–24px`
- Body: `16px`
- Small text / labels: `12–14px`
- Structure: Left-hand sidebar navigation with icons (Coach, Admin, Client views), Top bar with account settings, notifications, and Stripe Test Mode Toggle, Center dashboard for: Session log form, Billing requests and approvals, Client/session search + filters, Visual analytics (session counts, revenue, etc.)
- Icons: Use Lucide or Tabler Icons – clean, outline-based, minimal clutter.
- Components: Cards with light drop shadow (`box-shadow: rgba(0, 0, 0, 0.05)`), Buttons with strong hover states (e.g., red darkening, neon green pop), Forms with clear labels and active states
- Subtle hover and submit animations (150–250ms)
- Form validation success = slide-in checkmark
- Stripe test mode toggle = switch with glow pulse
- Session log confirmation = toast message with soft fade