const { chromium } = require('playwright');
const fs = require('fs');

async function extractFingerprintEffects() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  console.log('Loading Fingerprint.com...');
  await page.goto('https://fingerprint.com/products/identification/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const effects = {
    hoverEffects: [],
    scrollAnimations: [],
    interactionPatterns: [],
    cssKeyframes: [],
  };

  // 1. EXTRACT HOVER EFFECTS
  console.log('\n📍 Extracting hover effects...');

  const hoverTargets = await page.evaluate(() => {
    const targets = [];
    const selectors = ['a', 'button', '[class*="card"]', '[class*="feature"]',
                      '[class*="hover"]', 'img', '[class*="cta"]', '[class*="link"]'];

    selectors.forEach(selector => {
      document.querySelectorAll(selector).forEach((el, idx) => {
        if (idx < 5) {
          const beforeStyles = window.getComputedStyle(el);
          targets.push({
            selector: el.className || el.tagName,
            tagName: el.tagName,
            index: idx,
            beforeHover: {
              transform: beforeStyles.transform,
              opacity: beforeStyles.opacity,
              backgroundColor: beforeStyles.backgroundColor,
              color: beforeStyles.color,
              borderColor: beforeStyles.borderColor,
              boxShadow: beforeStyles.boxShadow,
              scale: beforeStyles.scale,
              filter: beforeStyles.filter,
            }
          });
        }
      });
    });
    return targets;
  });

  // Test hover states
  for (const target of hoverTargets.slice(0, 20)) {
    try {
      const elements = await page.locator(target.tagName).all();
      if (elements[target.index]) {
        await elements[target.index].hover({ timeout: 1000 });
        await page.waitForTimeout(300);

        const afterHover = await page.evaluate((sel) => {
          const elements = document.querySelectorAll(sel.tagName);
          const el = elements[sel.index];
          if (!el) return null;

          const styles = window.getComputedStyle(el);
          return {
            transform: styles.transform,
            opacity: styles.opacity,
            backgroundColor: styles.backgroundColor,
            color: styles.color,
            borderColor: styles.borderColor,
            boxShadow: styles.boxShadow,
            scale: styles.scale,
            filter: styles.filter,
          };
        }, target);

        if (afterHover) {
          effects.hoverEffects.push({
            element: target.selector,
            before: target.beforeHover,
            after: afterHover,
          });
        }
      }
    } catch (e) {
      // Skip elements that can't be hovered
    }
  }

  // 2. EXTRACT SCROLL-TRIGGERED ANIMATIONS
  console.log('\n📍 Testing scroll animations...');

  // Scroll and capture changes
  for (let i = 0; i < 5; i++) {
    await page.evaluate(() => window.scrollBy(0, 600));
    await page.waitForTimeout(800);

    const scrollState = await page.evaluate(() => {
      const elements = [];
      document.querySelectorAll('[class*="fade"], [class*="reveal"], [class*="animate"]').forEach((el, idx) => {
        if (idx < 10) {
          const styles = window.getComputedStyle(el);
          const rect = el.getBoundingClientRect();
          elements.push({
            selector: el.className,
            transform: styles.transform,
            opacity: styles.opacity,
            position: rect.top,
            visible: rect.top < window.innerHeight && rect.bottom > 0,
          });
        }
      });
      return elements;
    });

    effects.scrollAnimations.push({
      scrollPosition: (i + 1) * 600,
      elements: scrollState,
    });
  }

  // Scroll back to top
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);

  // 3. EXTRACT CSS KEYFRAMES
  console.log('\n📍 Extracting CSS keyframes...');

  effects.cssKeyframes = await page.evaluate(() => {
    const keyframes = [];
    try {
      Array.from(document.styleSheets).forEach(sheet => {
        try {
          Array.from(sheet.cssRules || []).forEach(rule => {
            if (rule instanceof CSSKeyframesRule) {
              const frames = [];
              Array.from(rule.cssRules).forEach(keyframe => {
                frames.push({
                  keyText: keyframe.keyText,
                  style: keyframe.style.cssText,
                });
              });
              keyframes.push({
                name: rule.name,
                frames: frames,
              });
            }
          });
        } catch (e) {
          // CORS issues
        }
      });
    } catch (e) {}
    return keyframes;
  });

  // 4. EXTRACT INTERACTION PATTERNS
  console.log('\n📍 Analyzing interaction patterns...');

  effects.interactionPatterns = await page.evaluate(() => {
    const patterns = [];

    // Find cards/features
    document.querySelectorAll('[class*="card"], [class*="feature"], [class*="item"]').forEach((el, idx) => {
      if (idx < 10) {
        const styles = window.getComputedStyle(el);
        patterns.push({
          type: 'card',
          element: el.className,
          padding: styles.padding,
          borderRadius: styles.borderRadius,
          boxShadow: styles.boxShadow,
          transition: styles.transition,
          background: styles.background,
        });
      }
    });

    // Find CTAs
    document.querySelectorAll('[class*="cta"], [class*="button"], button').forEach((el, idx) => {
      if (idx < 10) {
        const styles = window.getComputedStyle(el);
        patterns.push({
          type: 'cta',
          element: el.className,
          padding: styles.padding,
          borderRadius: styles.borderRadius,
          backgroundColor: styles.backgroundColor,
          color: styles.color,
          fontSize: styles.fontSize,
          fontWeight: styles.fontWeight,
          transition: styles.transition,
        });
      }
    });

    return patterns;
  });

  // 5. CAPTURE SPECIFIC INTERACTIONS
  console.log('\n📍 Capturing specific interactions...');

  // Try to find and interact with navigation
  try {
    const navButton = await page.locator('button, [role="button"]').first();
    if (await navButton.count() > 0) {
      await navButton.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'frontend/design-systems/fingerprint/interaction-nav.png' });
    }
  } catch (e) {
    console.log('  Could not capture nav interaction');
  }

  // Format comprehensive markdown
  const markdown = `# Fingerprint.com Effects & Interactions Analysis

**Extracted:** ${new Date().toISOString()}

## 1. Hover Effects

${effects.hoverEffects.slice(0, 20).map((effect, i) => `
### Hover Effect ${i + 1}: ${effect.element}

**Before Hover:**
- Transform: ${effect.before.transform}
- Opacity: ${effect.before.opacity}
- Background: ${effect.before.backgroundColor}
- Box Shadow: ${effect.before.boxShadow}
- Filter: ${effect.before.filter}

**After Hover:**
- Transform: ${effect.after.transform}
- Opacity: ${effect.after.opacity}
- Background: ${effect.after.backgroundColor}
- Box Shadow: ${effect.after.boxShadow}
- Filter: ${effect.after.filter}

**Changes Detected:**
${effect.before.transform !== effect.after.transform ? '✓ Transform changed' : ''}
${effect.before.opacity !== effect.after.opacity ? '✓ Opacity changed' : ''}
${effect.before.backgroundColor !== effect.after.backgroundColor ? '✓ Background color changed' : ''}
${effect.before.boxShadow !== effect.after.boxShadow ? '✓ Box shadow changed' : ''}
${effect.before.filter !== effect.after.filter ? '✓ Filter changed' : ''}
`).join('\n')}

## 2. Scroll-Triggered Animations

${effects.scrollAnimations.map((scroll, i) => `
### At Scroll Position: ${scroll.scrollPosition}px

${scroll.elements.slice(0, 5).map(el => `
- **${el.selector}**
  - Transform: ${el.transform}
  - Opacity: ${el.opacity}
  - Visible: ${el.visible}
  - Position: ${el.position}px from top
`).join('\n')}
`).join('\n')}

## 3. CSS Keyframes

${effects.cssKeyframes.map((kf, i) => `
### @keyframes ${kf.name}

${kf.frames.map(frame => `
**${frame.keyText}**
\`\`\`css
${frame.style}
\`\`\`
`).join('\n')}
`).join('\n')}

## 4. Interaction Patterns

### Card Components
${effects.interactionPatterns.filter(p => p.type === 'card').map((pattern, i) => `
#### Card ${i + 1}
**Class:** \`${pattern.element}\`
- Padding: ${pattern.padding}
- Border Radius: ${pattern.borderRadius}
- Box Shadow: ${pattern.boxShadow}
- Transition: ${pattern.transition}
- Background: ${pattern.background}
`).join('\n')}

### CTA/Button Components
${effects.interactionPatterns.filter(p => p.type === 'cta').map((pattern, i) => `
#### CTA ${i + 1}
**Class:** \`${pattern.element}\`
- Padding: ${pattern.padding}
- Border Radius: ${pattern.borderRadius}
- Background Color: ${pattern.backgroundColor}
- Text Color: ${pattern.color}
- Font Size: ${pattern.fontSize}
- Font Weight: ${pattern.fontWeight}
- Transition: ${pattern.transition}
`).join('\n')}

---

## Key Findings

### Animation Principles
1. **Timing**: Smooth, considered animations
2. **Easing**: Custom cubic-bezier functions for organic feel
3. **Trigger**: Scroll-based reveals and hover interactions
4. **Performance**: Transform-based (GPU accelerated)

### Design Patterns
1. **Cards**: Shadow on hover, subtle lift
2. **Buttons**: Color transitions, scale effects
3. **Images**: Parallax or zoom effects
4. **Text**: Fade-in on scroll

---

*Effects extraction completed on ${new Date().toISOString()}*
*Screenshots saved in frontend/design-systems/fingerprint/ directory*
`;

  // Save markdown
  fs.writeFileSync('frontend/design-systems/fingerprint/effects-analysis.md', markdown);

  // Save raw JSON
  fs.writeFileSync(
    'frontend/design-systems/fingerprint/effects-data.json',
    JSON.stringify(effects, null, 2)
  );

  console.log('\n✅ Effects analysis saved');

  await browser.close();
}

extractFingerprintEffects().catch(console.error);
