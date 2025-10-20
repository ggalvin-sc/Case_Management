const { chromium } = require('playwright');
const fs = require('fs');

async function extractDetailedDesign() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log('Loading Upstatement.com...');
  await page.goto('https://upstatement.com/', { waitUntil: 'networkidle' });

  const designDetails = await page.evaluate(() => {
    // Helper to get computed styles
    const getStyles = (selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      return window.getComputedStyle(element);
    };

    // 1. Extract ALL typography sizes used across the site
    const typographySizes = new Map();
    document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, a, li, div').forEach(el => {
      const styles = window.getComputedStyle(el);
      const key = `${styles.fontSize}_${styles.fontWeight}_${styles.lineHeight}`;
      if (!typographySizes.has(key)) {
        typographySizes.set(key, {
          fontSize: styles.fontSize,
          fontWeight: styles.fontWeight,
          lineHeight: styles.lineHeight,
          fontFamily: styles.fontFamily,
          letterSpacing: styles.letterSpacing,
          textTransform: styles.textTransform,
        });
      }
    });

    // 2. Extract transition/animation properties
    const animations = [];
    document.querySelectorAll('a, button, [class*="card"], [class*="hover"]').forEach(el => {
      const styles = window.getComputedStyle(el);
      if (styles.transition !== 'all 0s ease 0s') {
        animations.push({
          element: el.tagName + (el.className ? '.' + el.className.split(' ')[0] : ''),
          transition: styles.transition,
          transform: styles.transform,
          animation: styles.animation,
        });
      }
    });

    // 3. Extract grid/layout patterns
    const layouts = [];
    document.querySelectorAll('[class*="grid"], [class*="flex"], section, .container').forEach(el => {
      const styles = window.getComputedStyle(el);
      layouts.push({
        selector: el.className || el.tagName,
        display: styles.display,
        gridTemplateColumns: styles.gridTemplateColumns,
        gridGap: styles.gridGap,
        flexDirection: styles.flexDirection,
        justifyContent: styles.justifyContent,
        alignItems: styles.alignItems,
        gap: styles.gap,
        maxWidth: styles.maxWidth,
      });
    });

    // 4. Extract shadows and borders
    const shadows = new Set();
    const borders = new Set();
    document.querySelectorAll('*').forEach(el => {
      const styles = window.getComputedStyle(el);
      if (styles.boxShadow !== 'none') shadows.add(styles.boxShadow);
      if (styles.border !== '0px none rgb(0, 0, 0)' && styles.border !== '') {
        borders.add(styles.border);
      }
      if (styles.borderRadius !== '0px') borders.add(`border-radius: ${styles.borderRadius}`);
    });

    // 5. Extract form input styles
    const formStyles = [];
    document.querySelectorAll('input, textarea, select').forEach(el => {
      const styles = window.getComputedStyle(el);
      formStyles.push({
        type: el.tagName + (el.type ? `[${el.type}]` : ''),
        padding: styles.padding,
        border: styles.border,
        borderRadius: styles.borderRadius,
        fontSize: styles.fontSize,
        backgroundColor: styles.backgroundColor,
        color: styles.color,
        height: styles.height,
      });
    });

    // 6. Extract link styles
    const linkStyles = [];
    document.querySelectorAll('a').forEach(link => {
      const styles = window.getComputedStyle(link);
      linkStyles.push({
        textDecoration: styles.textDecoration,
        color: styles.color,
        fontWeight: styles.fontWeight,
        borderBottom: styles.borderBottom,
      });
    });

    // 7. Extract spacing values (margins/paddings)
    const spacingValues = new Set();
    document.querySelectorAll('*').forEach(el => {
      const styles = window.getComputedStyle(el);
      if (styles.margin !== '0px') spacingValues.add(`margin: ${styles.margin}`);
      if (styles.padding !== '0px') spacingValues.add(`padding: ${styles.padding}`);
    });

    // 8. Extract responsive breakpoints by checking media queries
    const styleSheets = Array.from(document.styleSheets);
    const mediaQueries = new Set();
    styleSheets.forEach(sheet => {
      try {
        const rules = Array.from(sheet.cssRules || []);
        rules.forEach(rule => {
          if (rule instanceof CSSMediaRule) {
            mediaQueries.add(rule.conditionText);
          }
        });
      } catch (e) {
        // CORS issues with external stylesheets
      }
    });

    // 9. Extract navigation styles
    const navStyles = [];
    document.querySelectorAll('nav, header, [class*="nav"]').forEach(el => {
      const styles = window.getComputedStyle(el);
      navStyles.push({
        element: el.className || el.tagName,
        position: styles.position,
        top: styles.top,
        zIndex: styles.zIndex,
        backgroundColor: styles.backgroundColor,
        padding: styles.padding,
        borderBottom: styles.borderBottom,
      });
    });

    // 10. Extract card/module styles
    const cardStyles = [];
    document.querySelectorAll('[class*="card"], article, [class*="item"]').forEach(el => {
      const styles = window.getComputedStyle(el);
      cardStyles.push({
        className: el.className,
        padding: styles.padding,
        backgroundColor: styles.backgroundColor,
        border: styles.border,
        borderRadius: styles.borderRadius,
        boxShadow: styles.boxShadow,
      });
    });

    return {
      typography: Array.from(typographySizes.values()),
      animations: animations.slice(0, 20),
      layouts: layouts.slice(0, 15),
      shadows: Array.from(shadows),
      borders: Array.from(borders),
      formStyles,
      linkStyles: linkStyles.slice(0, 10),
      spacingValues: Array.from(spacingValues).slice(0, 50),
      mediaQueries: Array.from(mediaQueries),
      navStyles,
      cardStyles: cardStyles.slice(0, 10),
    };
  });

  // Format comprehensive markdown
  const markdown = `# Upstatement Design System - Complete Analysis

## Typography Scale

${designDetails.typography.map((t, i) => `
### Size ${i + 1}
- Font Family: ${t.fontFamily}
- Font Size: ${t.fontSize}
- Font Weight: ${t.fontWeight}
- Line Height: ${t.lineHeight}
- Letter Spacing: ${t.letterSpacing}
- Text Transform: ${t.textTransform}
`).join('\n')}

## Animations & Transitions

${designDetails.animations.map((a, i) => `
### Animation ${i + 1} (${a.element})
- Transition: ${a.transition}
- Transform: ${a.transform}
- Animation: ${a.animation}
`).join('\n')}

## Layout Patterns

${designDetails.layouts.map((l, i) => `
### Layout ${i + 1} (${l.selector})
- Display: ${l.display}
- Grid Template Columns: ${l.gridTemplateColumns}
- Grid Gap: ${l.gridGap}
- Flex Direction: ${l.flexDirection}
- Justify Content: ${l.justifyContent}
- Align Items: ${l.alignItems}
- Gap: ${l.gap}
- Max Width: ${l.maxWidth}
`).join('\n')}

## Shadows

${designDetails.shadows.length > 0 ? designDetails.shadows.map(s => `\`\`\`css\nbox-shadow: ${s};\n\`\`\``).join('\n\n') : 'No box shadows used'}

## Borders

${designDetails.borders.length > 0 ? Array.from(designDetails.borders).map(b => `\`\`\`css\n${b}\n\`\`\``).join('\n\n') : 'Minimal borders'}

## Form Styles

${designDetails.formStyles.map((f, i) => `
### ${f.type}
- Padding: ${f.padding}
- Border: ${f.border}
- Border Radius: ${f.borderRadius}
- Font Size: ${f.fontSize}
- Background: ${f.backgroundColor}
- Color: ${f.color}
- Height: ${f.height}
`).join('\n')}

## Link Styles

${designDetails.linkStyles.slice(0, 5).map((l, i) => `
### Link Style ${i + 1}
- Text Decoration: ${l.textDecoration}
- Color: ${l.color}
- Font Weight: ${l.fontWeight}
- Border Bottom: ${l.borderBottom}
`).join('\n')}

## Spacing System

Common spacing values used:
${designDetails.spacingValues.slice(0, 30).map(s => `- ${s}`).join('\n')}

## Responsive Breakpoints

${designDetails.mediaQueries.length > 0 ? designDetails.mediaQueries.map(q => `\`\`\`css\n@media ${q}\n\`\`\``).join('\n\n') : 'Media queries not accessible via JS (external stylesheets)'}

## Navigation Styles

${designDetails.navStyles.map((n, i) => `
### Nav ${i + 1} (${n.element})
- Position: ${n.position}
- Top: ${n.top}
- Z-Index: ${n.zIndex}
- Background: ${n.backgroundColor}
- Padding: ${n.padding}
- Border Bottom: ${n.borderBottom}
`).join('\n')}

## Card/Module Styles

${designDetails.cardStyles.map((c, i) => `
### Card ${i + 1} (${c.className})
- Padding: ${c.padding}
- Background: ${c.backgroundColor}
- Border: ${c.border}
- Border Radius: ${c.borderRadius}
- Box Shadow: ${c.boxShadow}
`).join('\n')}

---

*Complete extraction on ${new Date().toISOString()}*
`;

  // Append to existing file
  const existingContent = fs.readFileSync('frontend/design-system.md', 'utf8');
  fs.writeFileSync('frontend/design-system.md', existingContent + '\n\n---\n\n' + markdown);

  console.log('\n✓ Detailed design system analysis added to frontend/design-system.md');

  await browser.close();
}

extractDetailedDesign().catch(console.error);
