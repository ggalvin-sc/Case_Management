const { chromium } = require('playwright');
const fs = require('fs');

async function extractDesignSystem() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log('Loading Upstatement.com...');
  await page.goto('https://upstatement.com/', { waitUntil: 'networkidle' });

  // Extract design system details
  const designSystem = await page.evaluate(() => {
    const computedStyles = (selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      return window.getComputedStyle(element);
    };

    // Extract font information
    const fonts = {
      body: computedStyles('body'),
      h1: computedStyles('h1'),
      h2: computedStyles('h2'),
      h3: computedStyles('h3'),
      p: computedStyles('p'),
      button: computedStyles('button, a.button, .btn'),
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
        };
      }
    });

    // Extract color palette from various elements
    const colors = new Set();
    document.querySelectorAll('*').forEach(el => {
      const styles = window.getComputedStyle(el);
      if (styles.color) colors.add(styles.color);
      if (styles.backgroundColor && styles.backgroundColor !== 'rgba(0, 0, 0, 0)') {
        colors.add(styles.backgroundColor);
      }
    });

    // Extract button styles
    const buttons = [];
    document.querySelectorAll('button, a.button, .btn, a[class*="button"]').forEach(btn => {
      const styles = window.getComputedStyle(btn);
      buttons.push({
        selector: btn.className || btn.tagName,
        padding: styles.padding,
        borderRadius: styles.borderRadius,
        fontSize: styles.fontSize,
        fontWeight: styles.fontWeight,
        backgroundColor: styles.backgroundColor,
        color: styles.color,
        border: styles.border,
      });
    });

    // Extract spacing patterns
    const spacing = {
      sections: [],
      containers: [],
    };

    document.querySelectorAll('section, .section').forEach(section => {
      const styles = window.getComputedStyle(section);
      spacing.sections.push({
        padding: styles.padding,
        margin: styles.margin,
      });
    });

    document.querySelectorAll('.container, [class*="container"]').forEach(container => {
      const styles = window.getComputedStyle(container);
      spacing.containers.push({
        maxWidth: styles.maxWidth,
        padding: styles.padding,
      });
    });

    return {
      fonts: fontData,
      colors: Array.from(colors),
      buttons: buttons.slice(0, 10), // First 10 buttons
      spacing,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      }
    };
  });

  // Also capture screenshot for reference
  await page.screenshot({
    path: 'scripts/upstatement-reference.png',
    fullPage: true
  });

  // Format the output
  const markdown = `# Upstatement Design System Analysis

## Typography

### Font Families
${Object.entries(designSystem.fonts).map(([element, styles]) => `
**${element.toUpperCase()}**
- Font Family: ${styles.fontFamily}
- Font Size: ${styles.fontSize}
- Font Weight: ${styles.fontWeight}
- Line Height: ${styles.lineHeight}
- Letter Spacing: ${styles.letterSpacing}
- Color: ${styles.color}
`).join('\n')}

## Color Palette

${designSystem.colors.map(color => `- ${color}`).join('\n')}

## Button Styles

${designSystem.buttons.map((btn, i) => `
### Button ${i + 1} (${btn.selector})
- Background: ${btn.backgroundColor}
- Color: ${btn.color}
- Padding: ${btn.padding}
- Border Radius: ${btn.borderRadius}
- Font Size: ${btn.fontSize}
- Font Weight: ${btn.fontWeight}
- Border: ${btn.border}
`).join('\n')}

## Spacing Patterns

### Section Spacing
${designSystem.spacing.sections.slice(0, 5).map((s, i) => `
**Section ${i + 1}**
- Padding: ${s.padding}
- Margin: ${s.margin}
`).join('\n')}

### Container Widths
${designSystem.spacing.containers.slice(0, 3).map((c, i) => `
**Container ${i + 1}**
- Max Width: ${c.maxWidth}
- Padding: ${c.padding}
`).join('\n')}

---

*Extracted on ${new Date().toISOString()}*
*Screenshot saved at: scripts/upstatement-reference.png*
`;

  // Save to file
  fs.writeFileSync('frontend/design-system.md', markdown);
  console.log('\n✓ Design system documented in frontend/design-system.md');
  console.log('✓ Screenshot saved to scripts/upstatement-reference.png');

  await browser.close();
}

extractDesignSystem().catch(console.error);
