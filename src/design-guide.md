# NFL Fantasy League - Design System Guide

## 🎨 Design Philosophy

Our design system follows the NFL theme with a modern, dark interface that emphasizes clarity, consistency, and user engagement. The design patterns implemented across the League Dashboard serve as the foundation for all screens.

## 🎯 Core Design Components

### 1. **PageHeader Component**
A hero-style header with gradient background and key metrics display.

```tsx
<PageHeader 
  title="Page Title"
  subtitle="Descriptive subtitle"
  badge={{ text: "STATUS", variant: "default" }}
  stats={[
    { label: "Metric 1", value: "123", highlight: true },
    { label: "Metric 2", value: "456" }
  ]}
/>
```

### 2. **SectionHeader Component**
Consistent section headers with optional actions.

```tsx
<SectionHeader
  title="Section Title"
  subtitle="Optional description"
  action={<Button>Action</Button>}
/>
```

### 3. **StatCard Component**
Metric display cards with icons and trend indicators.

```tsx
<StatCard
  icon={Trophy}
  iconColor="text-yellow-400"
  label="Metric Name"
  value="123"
  subValue="Additional context"
  trend="up" // up, down, or neutral
/>
```

## 🎨 Color Palette

### Primary Colors
- **Background**: `bg-nfl-dark-gray` - Main background color
- **Cards**: `bg-nfl-gray` - Card backgrounds
- **Borders**: `border-nfl-light-gray/20` - Subtle borders

### Accent Colors
- **Primary**: `bg-nfl-blue` / `text-nfl-blue` - Primary actions and highlights
- **Success**: `bg-nfl-green` / `text-nfl-green` - Success states
- **Warning**: `bg-yellow-400` / `text-yellow-400` - Warnings and highlights
- **Danger**: `bg-nfl-red` / `text-nfl-red` - Danger states
- **Special**: `bg-purple-400` / `text-purple-400` - Special metrics

## 📐 Layout Patterns

### Page Structure
```
1. Layout wrapper
2. Navigation (LeagueNav)
3. League Header (shared component)
4. Page-specific header (PageHeader or custom)
5. Stats overview (grid of StatCards)
6. Main content sections with SectionHeaders
7. Sidebar content (if applicable)
```

### Grid Systems
- **Stats Grid**: `grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4`
- **Content Grid**: `grid lg:grid-cols-3 gap-8` (2/3 + 1/3 split)
- **Card Grid**: `grid sm:grid-cols-2 gap-4`

## 🎯 Design Patterns Applied

### 1. **Dashboard Page**
- Hero header with gradient background
- 4-column stats overview
- Clean card-based sections
- Sidebar with complementary information

### 2. **Standings Page**
- Stats overview cards at the top
- Visual rank indicators (gold, silver, bronze medals)
- Row highlighting for user's team
- Additional context cards below main table

### 3. **Waivers Page**
- Priority visualization with colored badges
- Clear status indicators
- Helpful tips and schedule information
- Action buttons aligned to the right

## 🎨 Visual Enhancements

### Card Styling
```tsx
// Base card style
className="bg-nfl-gray border-nfl-light-gray/20 overflow-hidden"

// Hover effect
className="hover:border-nfl-blue/30 transition-all duration-300"

// With gradient accent
<div className="bg-gradient-to-r from-nfl-blue/10 to-transparent p-1">
```

### Badge Variants
```tsx
// Status badges
<Badge className="bg-nfl-green/20 text-nfl-green border-nfl-green/30">SAFE</Badge>
<Badge className="bg-nfl-red/20 text-nfl-red border-nfl-red/30">ELIMINATED</Badge>
<Badge className="bg-nfl-blue/20 text-nfl-blue border-nfl-blue/30">YOU</Badge>
```

### Loading States
```tsx
<div className="animate-pulse">
  <div className="h-6 bg-gray-700 rounded mb-4 w-3/4"></div>
  <div className="h-4 bg-gray-700 rounded w-1/2"></div>
</div>
```

## 🔧 Implementation Tips

1. **Always use the dark theme** - All backgrounds should be dark gray variants
2. **Consistent spacing** - Use `mb-8` between major sections, `mb-6` for subsections
3. **Interactive feedback** - All clickable elements should have hover states
4. **Visual hierarchy** - Use size, color, and spacing to create clear hierarchy
5. **Loading states** - Always provide skeleton loaders for async content

## 📱 Responsive Design

- **Mobile**: Stack all grids to single column
- **Tablet**: 2-column grids for most content
- **Desktop**: Full grid layouts with sidebars

## 🎯 Future Enhancements

1. Add more animation transitions
2. Implement dark/light theme toggle
3. Add more detailed loading states
4. Create additional card variants
5. Enhance mobile navigation

This design system ensures consistency across all pages while maintaining the NFL theme and providing an engaging user experience.