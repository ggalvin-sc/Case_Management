# Upstatement Design System Implementation Guide

Complete design system extracted from [upstatement.com](https://upstatement.com) and ready to use in your case management application.

## 📁 Files Created

1. **`css/upstatement-effects.css`** - Complete CSS with all effects, animations, and utilities
2. **`js/scroll-reveal.js`** - Scroll-triggered animation controller
3. **`upstatement-demo.html`** - Live demo of all components and effects
4. **`design-system.md`** - Complete design documentation and reference

## 🚀 Quick Start

### 1. Add to Your HTML

```html
<head>
    <!-- Add the CSS -->
    <link rel="stylesheet" href="css/upstatement-effects.css">
</head>
<body>
    <!-- Your content -->

    <!-- Add the JS before closing body tag -->
    <script src="js/scroll-reveal.js"></script>
</body>
```

### 2. View the Demo

Open `upstatement-demo.html` in your browser to see all effects in action.

## 🎨 Key Features

### Typography
- **Fonts**: GT America (sans-serif) + TT Ramillas (serif display)
- **Base size**: 19.4px
- **Line height**: 1.4 (generous, readable)

### Colors
```css
--color-black: rgb(0, 0, 0)
--color-white: rgb(255, 255, 255)
--color-accent: rgb(255, 60, 94)
--color-gray-medium: rgb(133, 133, 133)
```

### Signature Effects

#### 1. 7-Second Image Zoom (Most Important!)
```html
<div class="image-hover-container">
    <img src="your-image.jpg" class="image-hover-zoom" alt="">
</div>
```

#### 2. Button Hover
```html
<button class="btn">Click Me</button>
<button class="btn btn-circle">+</button>
```

#### 3. Scroll Reveal
```html
<div class="scroll-reveal">
    <h2>This fades in on scroll</h2>
</div>

<!-- Staggered reveal for lists -->
<div class="scroll-reveal-stagger">
    <div>Item 1 (delays 0s)</div>
    <div>Item 2 (delays 0.1s)</div>
    <div>Item 3 (delays 0.2s)</div>
</div>
```

#### 4. Card Styles
```html
<!-- Standard card with border -->
<div class="card">
    <h3>Card Title</h3>
    <p>Card content</p>
</div>

<!-- Minimal card (no border) -->
<div class="card-minimal">
    <h3>Minimal Card</h3>
</div>
```

#### 5. Forms
```html
<form>
    <div class="form-group">
        <label for="email">Email</label>
        <input type="email" id="email" placeholder="you@example.com">
    </div>
    <button class="btn">Submit</button>
</form>
```

## 🎬 Animations Available

### Keyframe Animations
- `fadeIn` - Fade in with scale
- `slideUp` - Slide up from bottom
- `blobWiggle` - Organic wiggle effect
- `colorCycle` - Color palette cycling
- `spin` - Rotation (for loaders)
- `cursorBlink` - Blinking cursor

### Usage
```html
<div class="blob-wiggle">Wiggles organically</div>
<div class="color-cycle">Cycles through colors</div>
<div class="spin">Rotates continuously</div>
```

## 🛠️ Utility Classes

### Spacing
```html
<div class="mb-sm">Small margin bottom</div>
<div class="mb-md">Medium margin bottom</div>
<div class="mb-lg">Large margin bottom</div>
<div class="mb-xl">XL margin bottom</div>
<div class="mb-2xl">2XL margin bottom (115px!)</div>
```

### Typography
```html
<p class="text-light">Ultra-light weight (100)</p>
<p class="text-regular">Regular weight (300)</p>
<p class="text-medium">Medium weight (500)</p>
<p class="text-small">Smaller font size</p>
```

### Layout
```html
<div class="flex gap-md">
    <div>Item 1</div>
    <div>Item 2</div>
</div>
```

## ⚙️ Custom Properties (CSS Variables)

All design tokens are available as CSS variables:

```css
/* Use in your own CSS */
.my-component {
    color: var(--color-white);
    background: var(--color-black);
    padding: var(--spacing-lg);
    transition: transform var(--duration-fast) var(--ease-snappy);
}
```

### Important Variables
- **Colors**: `--color-*`
- **Spacing**: `--spacing-xs` to `--spacing-2xl`
- **Easing**: `--ease-smooth`, `--ease-snappy`, `--ease-reveal`
- **Durations**: `--duration-fast`, `--duration-slow`, `--duration-image-zoom`

## 🎯 Implementation Tips

### 1. Start with Navigation
```html
<nav class="nav">
    <div class="nav__logo">
        <a href="#" class="nav__link">Logo</a>
    </div>
    <div class="nav__links">
        <a href="#" class="nav__link">Home</a>
        <a href="#" class="nav__link">About</a>
    </div>
</nav>
```

### 2. Add Scroll Reveals to Sections
```html
<section class="scroll-reveal">
    <h2>Your Section Title</h2>
    <p>Content appears on scroll</p>
</section>
```

### 3. Use Image Hover on Cards
```html
<div class="card-minimal">
    <div class="image-hover-container">
        <img src="project.jpg" class="image-hover-zoom" alt="Project">
    </div>
    <h3>Project Title</h3>
    <p>Description</p>
</div>
```

### 4. Style Buttons Consistently
```html
<!-- Primary actions -->
<button class="btn">Submit</button>

<!-- Icon buttons -->
<button class="btn btn-circle">×</button>
```

## 🎨 Customizing

### Change Colors
```css
:root {
    --color-accent: rgb(YOUR, RGB, VALUES);
}
```

### Adjust Animation Speed
```css
:root {
    --duration-image-zoom: 5s; /* Make it faster */
}
```

### Custom Easing
```css
:root {
    --ease-custom: cubic-bezier(0.4, 0, 0.2, 1);
}
```

## 📱 Responsive Breakpoints

The system includes 4 breakpoints:
- **Mobile**: 0-599px (default)
- **Tablet**: 600px+
- **Desktop**: 1070px+
- **Large**: 1400px+

## ♿ Accessibility

- All animations respect `prefers-reduced-motion`
- Focus states included on all interactive elements
- Semantic HTML recommended
- WCAG contrast ratios maintained

## 🔧 Applying to Your Case Management App

### Dashboard Stats Cards
```html
<div class="scroll-reveal-stagger">
    <div class="card">
        <h2 class="text-light" style="font-size: 48px;">127</h2>
        <p>Active Cases</p>
    </div>
    <div class="card">
        <h2 class="text-light" style="font-size: 48px;">$45,230</h2>
        <p>Unbilled Revenue</p>
    </div>
</div>
```

### Matter List
```html
<div class="scroll-reveal-stagger">
    <a href="/matter/1" class="card card-minimal">
        <h3>Matter #2024-001</h3>
        <p class="text-small">Client Name • Active</p>
    </a>
    <!-- More matters -->
</div>
```

### Forms
```html
<form class="scroll-reveal">
    <div class="form-group">
        <label for="client-name">Client Name</label>
        <input type="text" id="client-name">
    </div>
    <div class="form-group">
        <label for="matter-desc">Matter Description</label>
        <textarea id="matter-desc" rows="4"></textarea>
    </div>
    <button type="submit" class="btn">Create Matter</button>
</form>
```

## 📖 Next Steps

1. ✅ Open `upstatement-demo.html` to see everything in action
2. ✅ Add `upstatement-effects.css` to your main pages
3. ✅ Add `scroll-reveal.js` for scroll animations
4. ✅ Apply classes to your existing components
5. ✅ Customize colors/spacing to your brand

## 🔗 Resources

- Full design analysis: `design-system.md`
- Reference screenshots: `scripts/upstatement-reference.png`
- Effect screenshots: `scripts/effect-menu-open.png`

---

**Pro Tip**: Start by applying the image hover effect to your project cards and the scroll-reveal to your main sections. These two effects alone will dramatically elevate the feel of your application!
