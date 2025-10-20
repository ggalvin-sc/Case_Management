const { chromium } = require('playwright');
const fs = require('fs');

async function extractFingerprintDesign() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  console.log('Loading Fingerprint.com...');
  await page.goto('https://fingerprint.com/products/identification/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Extract comprehensive design system
  const designSystem = await page.evaluate(() => {
    const computedStyles = (selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      return window.getComputedStyle(element);
    };

    // Extract font information from various elements
    const fonts = {
      body: computedStyles('body'),
      h1: computedStyles('h1'),
      h2: computedStyles('h2'),
      h3: computedStyles('h3'),
      h4: computedStyles('h4'),
      p: computedStyles('p'),
      button: computedStyles('button'),
      a: computedStyles('a'),
    };

    const fontData = {};
    Object.keys(fonts).forEach(key => {
      if (fonts[key]) {
        fontData[key] = {
          fontFamily: fonts[key].fontFamily,
          fontSize: fonts[key].fontSize,
          fontWeight: fonts[key].fontWeight,
          lineHeight: fonts[key].lineHeight,
          letterSpacing: fonts[key].letterSpacing,
          color: fonts[key].color,
          textTransform: fonts[key].textTransform,
        };
      }
    });

    // Extract ALL unique colors used
    const colors = new Set();
    const backgroundColors = new Set();
    document.querySelectorAll('*').forEach(el => {
      const styles = window.getComputedStyle(el);
      if (styles.color && styles.color !== 'rgb(0, 0, 0)') colors.add(styles.color);
      if (styles.backgroundColor && styles.backgroundColor !== 'rgba(0, 0, 0, 0)') {
        backgroundColors.add(styles.backgroundColor);
      }
    });

    // Extract button styles
    const buttons = [];
    document.querySelectorAll('button, a[class*="button"], a[class*="btn"], .cta').forEach((btn, idx) => {
      if (idx < 20) {
        const styles = window.getComputedStyle(btn);
        buttons.push({
          className: btn.className,
          padding: styles.padding,
          borderRadius: styles.borderRadius,
          fontSize: styles.fontSize,
          fontWeight: styles.fontWeight,
          backgroundColor: styles.backgroundColor,
          color: styles.color,
          border: styles.border,
          textTransform: styles.textTransform,
          transition: styles.transition,
        });
      }
    });

    // Extract spacing patterns
    const spacing = {
      margins: new Set(),
      paddings: new Set(),
      gaps: new Set(),
    };

    document.querySelectorAll('section, div, article').forEach(el => {
      const styles = window.getComputedStyle(el);
      if (styles.margin !== '0px') spacing.margins.add(styles.margin);
      if (styles.padding !== '0px') spacing.paddings.add(styles.padding);
      if (styles.gap !== 'normal') spacing.gaps.add(styles.gap);
    });

    // Extract border radius patterns
    const borderRadii = new Set();
    document.querySelectorAll('*').forEach(el => {
      const styles = window.getComputedStyle(el);
      if (styles.borderRadius !== '0px') borderRadii.add(styles.borderRadius);
    });

    // Extract shadows
    const shadows = new Set();
    document.querySelectorAll('*').forEach(el => {
      const styles = window.getComputedStyle(el);
      if (styles.boxShadow !== 'none') shadows.add(styles.boxShadow);
    });

    // Extract animations
    const animations = [];
    document.querySelectorAll('*').forEach((el, idx) => {
      const styles = window.getComputedStyle(el);
      if (styles.animation !== 'none 0s ease 0s 1 normal none running' && idx < 50) {
        animations.push({
          element: el.className,
          animation: styles.animation,
          animationName: styles.animationName,
          animationDuration: styles.animationDuration,
          animationTimingFunction: styles.animationTimingFunction,
        });
      }
    });

    // Extract transitions
    const transitions = [];
    const transitionSet = new Set();
    document.querySelectorAll('*').forEach(el => {
      const styles = window.getComputedStyle(el);
      if (styles.transition !== 'all 0s ease 0s' && !transitionSet.has(styles.transition)) {
        transitionSet.add(styles.transition);
        transitions.push({
          element: el.className,
          transition: styles.transition,
          transitionProperty: styles.transitionProperty,
          transitionDuration: styles.transitionDuration,
          transitionTimingFunction: styles.transitionTimingFunction,
        });
      }
    });

    // Extract gradient patterns
    const gradients = [];
    document.querySelectorAll('*').forEach((el, idx) => {
      const styles = window.getComputedStyle(el);
      const bg = styles.backgroundImage;
      if (bg && bg.includes('gradient') && idx < 20) {
        gradients.push({
          element: el.className,
          background: bg,
        });
      }
    });

    return {
      fonts: fontData,
      colors: Array.from(colors).slice(0, 50),
      backgroundColors: Array.from(backgroundColors).slice(0, 50),
      buttons: buttons,
      spacing: {
        margins: Array.from(spacing.margins).slice(0, 30),
        paddings: Array.from(spacing.paddings).slice(0, 30),
        gaps: Array.from(spacing.gaps).slice(0, 20),
      },
      borderRadii: Array.from(borderRadii).slice(0, 20),
      shadows: Array.from(shadows),
      animations: animations,
      transitions: transitions.slice(0, 30),
      gradients: gradients,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      }
    };
  });

  // Take full page screenshot
  await page.screenshot({
    path: 'frontend/design-systems/fingerprint/screenshot-full.png',
    fullPage: true
  });

  // Take viewport screenshot
  await page.screenshot({
    path: 'frontend/design-systems/fingerprint/screenshot-hero.png',
    fullPage: false
  });

  // Scroll and capture different sections
  await page.evaluate(() => window.scrollTo(0, 800));
  await page.waitForTimeout(500);
  await page.screenshot({
    path: 'frontend/design-systems/fingerprint/screenshot-mid.png',
    fullPage: false
  });

  // Format markdown documentation
  const markdown = `# Fingerprint.com Design System Analysis

**Extracted:** ${new Date().toISOString()}
**URL:** https://fingerprint.com/products/identification/

## Typography

### Font Families & Sizes

${Object.entries(designSystem.fonts).map(([element, styles]) => `
#### ${element.toUpperCase()}
- **Font Family:** ${styles.fontFamily}
- **Font Size:** ${styles.fontSize}
- **Font Weight:** ${styles.fontWeight}
- **Line Height:** ${styles.lineHeight}
- **Letter Spacing:** ${styles.letterSpacing}
- **Color:** ${styles.color}
- **Text Transform:** ${styles.textTransform}
`).join('\n')}

## Color Palette

### Text Colors
${designSystem.colors.map((color, i) => `${i + 1}. \`${color}\``).join('\n')}

### Background Colors
${designSystem.backgroundColors.map((color, i) => `${i + 1}. \`${color}\``).join('\n')}

## Button Styles

${designSystem.buttons.map((btn, i) => `
### Button ${i + 1}
**Class:** \`${btn.className}\`
- Background: ${btn.backgroundColor}
- Color: ${btn.color}
- Padding: ${btn.padding}
- Border Radius: ${btn.borderRadius}
- Font Size: ${btn.fontSize}
- Font Weight: ${btn.fontWeight}
- Border: ${btn.border}
- Text Transform: ${btn.textTransform}
- Transition: ${btn.transition}
`).join('\n')}

## Spacing System

### Margins (Common Patterns)
${designSystem.spacing.margins.map((m, i) => `${i + 1}. ${m}`).join('\n')}

### Paddings (Common Patterns)
${designSystem.spacing.paddings.map((p, i) => `${i + 1}. ${p}`).join('\n')}

### Gaps (Flexbox/Grid)
${designSystem.spacing.gaps.map((g, i) => `${i + 1}. ${g}`).join('\n')}

## Border Radius Patterns

${designSystem.borderRadii.map((r, i) => `${i + 1}. ${r}`).join('\n')}

## Box Shadows

${designSystem.shadows.map((s, i) => `
### Shadow ${i + 1}
\`\`\`css
box-shadow: ${s};
\`\`\`
`).join('\n')}

## Gradients

${designSystem.gradients.map((g, i) => `
### Gradient ${i + 1}
**Element:** \`${g.element}\`
\`\`\`css
background: ${g.background};
\`\`\`
`).join('\n')}

## Animations

${designSystem.animations.map((a, i) => `
### Animation ${i + 1}
**Element:** \`${a.element}\`
- Name: ${a.animationName}
- Duration: ${a.animationDuration}
- Timing Function: ${a.animationTimingFunction}
`).join('\n')}

## Transitions

${designSystem.transitions.map((t, i) => `
### Transition ${i + 1}
**Element:** \`${t.element}\`
- Property: ${t.transitionProperty}
- Duration: ${t.transitionDuration}
- Timing Function: ${t.transitionTimingFunction}
- Full: \`${t.transition}\`
`).join('\n')}

---

## Screenshots Captured

1. \`screenshot-full.png\` - Full page capture
2. \`screenshot-hero.png\` - Hero/viewport section
3. \`screenshot-mid.png\` - Mid-page content

---

*Extracted on ${new Date().toISOString()}*
`;

  // Save markdown
  fs.writeFileSync('frontend/design-systems/fingerprint/design-system.md', markdown);

  // Save raw JSON data
  fs.writeFileSync(
    'frontend/design-systems/fingerprint/design-data.json',
    JSON.stringify(designSystem, null, 2)
  );

  console.log('\n✅ Design system documented in frontend/design-systems/fingerprint/');
  console.log('✅ Screenshots saved');
  console.log('✅ Raw data saved to design-data.json');

  await browser.close();
}

extractFingerprintDesign().catch(console.error);
