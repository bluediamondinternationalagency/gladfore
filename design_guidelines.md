# Gladfore MVP Design Guidelines

## Design Approach

**Selected Framework**: Material Design principles with fintech-inspired trust elements
**References**: Stripe (professionalism), Revolut (mobile-first clarity), modern agricultural tech platforms
**Core Principle**: Build trust through clarity, simplicity, and accessibility for users with varying tech literacy

---

## Typography System

**Font Families** (via Google Fonts):
- Primary: Inter (UI, body text, forms)
- Display: Plus Jakarta Sans (headings, hero)

**Type Scale**:
- Hero Headline: text-5xl md:text-7xl, font-bold, leading-tight
- Section Headline: text-3xl md:text-4xl, font-bold
- Subsection: text-xl md:text-2xl, font-semibold
- Body Large: text-lg, font-normal, leading-relaxed
- Body: text-base, leading-relaxed
- Small/Meta: text-sm, font-medium
- Button Text: text-base, font-semibold, tracking-wide

---

## Layout System

**Tailwind Spacing Primitives**: Use 4, 6, 8, 12, 16, 20, 24, 32 for consistent rhythm
- Component padding: p-4, p-6, p-8
- Section spacing: py-16 md:py-24, py-20 md:py-32
- Card gaps: gap-6, gap-8
- Form fields: space-y-6

**Container Strategy**:
- Landing sections: max-w-7xl mx-auto px-4 md:px-8
- Dashboard content: max-w-6xl mx-auto px-4 md:px-6
- Forms: max-w-md mx-auto
- Data tables: w-full with horizontal scroll on mobile

---

## Landing Page Structure

### Hero Section (85vh on desktop, auto on mobile)
**Layout**: Full-width background image with centered content overlay
- Background: High-quality image of African farmers working in fields or fertilizer application
- Overlay: Semi-transparent dark gradient (top to bottom)
- Content: Centered column, max-w-4xl
- Headline + subtext + two CTA buttons (primary + secondary)
- Buttons: Blurred glass-morphism background (backdrop-blur-md bg-white/20)

### How It Works (py-20 md:py-32)
**Layout**: 3-column grid on desktop, single column on mobile
- Grid: grid-cols-1 md:grid-cols-3 gap-8 md:gap-12
- Each step: Icon (96x96), number badge, title, description
- Icons: Heroicons (outline style)
- Visual flow: Connect steps with subtle arrow indicators on desktop

### Why Choose Gladfore (py-20 md:py-32)
**Layout**: 2x2 grid on desktop, single column on mobile
- Grid: grid-cols-1 md:grid-cols-2 gap-8
- Feature cards: p-8, rounded-2xl border
- Each card: Icon, headline, 2-3 bullet points
- Icons: Heroicons (solid style, 48x48)

### Trust Indicators (py-16 md:py-24)
**Layout**: Centered statistics bar
- 3-4 stat blocks: flex layout, gap-12 md:gap-20
- Each stat: Large number (text-4xl), label below (text-sm)
- Example: "1000+ Farmers Served", "98% Approval Rate"

### Call-to-Action Footer (py-20 md:py-32)
**Layout**: Two-column split on desktop (60/40), stacked on mobile
- Left: Compelling final headline + supporting text
- Right: Dual CTA buttons (stacked vertically, gap-4)
- Background: Subtle pattern or gradient

---

## Dashboard Components

### Navigation
**Mobile**: Bottom tab bar (fixed, 4-5 items, icons + labels)
**Desktop**: Left sidebar (w-64, fixed, full-height)
- Logo at top (h-16, p-6)
- Navigation items: p-4, rounded-lg, gap-3, icon + text
- User profile section at bottom

### Data Tables
**Structure**: Responsive table with card fallback on mobile
- Desktop: Full table with sticky header
- Mobile: Cards with key info visible, expandable details
- Row actions: Right-aligned icon menu (3-dot)
- Pagination: Bottom, centered, showing range

### Forms
**Layout**: Vertical flow, full-width inputs
- Field groups: space-y-6
- Labels: text-sm font-medium, mb-2
- Inputs: p-4, rounded-lg, border-2, text-base
- Helper text: text-sm, mt-1.5
- Error states: Red accent with icon, descriptive message
- Submit buttons: Full-width on mobile, auto on desktop

### Cards
**Variants**:
- **Stat Cards**: p-6, rounded-xl, icon + value + label
- **Order Cards**: p-6, rounded-xl, header + details grid + action footer
- **Farmer Cards**: p-4, flex layout, avatar + info + quick actions

### Modals
**Structure**: Centered overlay with backdrop
- Container: max-w-md md:max-w-lg, rounded-2xl, p-6 md:p-8
- Header: Icon + title, close button (top-right)
- Content: space-y-6
- Footer: Flex layout, gap-4, buttons right-aligned

---

## Mobile-First Specifications

**Touch Targets**: Minimum 44x44px for all interactive elements
**Bottom Navigation**: Always visible, 64px height, safe-area padding
**Form Inputs**: Minimum 48px height, 16px font size (prevents zoom on iOS)
**Spacing**: Increase padding on mobile (p-4 vs p-6 on desktop)
**Tables**: Convert to card list below md breakpoint

---

## Component Library

**Buttons**:
- Primary: px-8 py-4, rounded-full, font-semibold
- Secondary: px-8 py-4, rounded-full, border-2
- Ghost: px-6 py-3, no border, hover background
- Icon-only: w-12 h-12, rounded-full, centered icon

**Badges**: px-3 py-1, rounded-full, text-xs font-semibold, uppercase

**Icons**: Heroicons library exclusively, 20x20 for inline, 24x24 for standalone

**Input Fields**: rounded-lg, border-2, focus:ring-4, transition-all

**Alerts**: p-4, rounded-lg, flex layout, icon + message + dismiss

---

## Images

**Hero Background**: Large landscape image (1920x1080 minimum) of farmers in African farmland or fertilizer distribution. Professional photography showing hope and productivity.

**How It Works Icons**: Use Heroicons - UserPlus, CurrencyDollar, TruckIcon

**Why Choose Section**: Use Heroicons - ShieldCheck, ChartBar, Bolt, Users

**Favicon**: Simple "G" lettermark with grain/leaf motif

---

## Accessibility

- All interactive elements keyboard navigable
- Form inputs with proper labels and ARIA attributes
- High contrast ratios for text (4.5:1 minimum)
- Focus indicators visible and consistent (ring-4)
- Alternative text for all images
- Screen reader announcements for dynamic content

---

## Animation Strategy

**Use Sparingly**:
- Page transitions: Simple fade-in (200ms)
- Button interactions: Scale and shadow on hover/active
- Form validation: Shake animation for errors
- Loading states: Subtle spinner or skeleton screens
- **No** scroll-triggered animations
- **No** parallax effects