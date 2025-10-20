const { chromium } = require('playwright');
const fs = require('fs');

async function extractAllEffects() {
  const browser = await chromium.launch({ headless: false }); // Non-headless to see effects
  const page = await browser.newPage();

  console.log('Loading Upstatement.com...');
  await page.goto('https://upstatement.com/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000); // Let page settle

  const effects = {
    hoverEffects: [],
    scrollAnimations: [],
    cssAnimations: [],
    transitions: [],
    transforms: [],
    cursorEffects: [],
    loadingAnimations: [],
    interactionEffects: [],
  };

  // 1. EXTRACT HOVER EFFECTS
  console.log('\n📍 Extracting hover effects...');

  const hoverTargets = await page.evaluate(() => {
    const targets = [];
    const selectors = ['a', 'button', '[class*="card"]', '[class*="tease"]',
                      '[class*="hover"]', 'img', '[class*="item"]'];

    selectors.forEach(selector => {
      document.querySelectorAll(selector).forEach((el, idx) => {
        if (idx < 5) { // Limit to first 5 of each type
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

  // 2. EXTRACT CSS ANIMATIONS & KEYFRAMES
  console.log('\n📍 Extracting CSS animations and keyframes...');

  effects.cssAnimations = await page.evaluate(() => {
    const animations = [];

    // Get all animated elements
    document.querySelectorAll('*').forEach(el => {
      const styles = window.getComputedStyle(el);
      if (styles.animation !== 'none 0s ease 0s 1 normal none running') {
        animations.push({
          element: el.className || el.tagName,
          animation: styles.animation,
          animationName: styles.animationName,
          animationDuration: styles.animationDuration,
          animationTimingFunction: styles.animationTimingFunction,
          animationDelay: styles.animationDelay,
          animationIterationCount: styles.animationIterationCount,
          animationDirection: styles.animationDirection,
          animationFillMode: styles.animationFillMode,
        });
      }
    });

    // Try to extract keyframes from stylesheets
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

    return { animations, keyframes };
  });

  // 3. EXTRACT SCROLL-TRIGGERED ANIMATIONS
  console.log('\n📍 Testing scroll animations...');

  // Get initial state
  const beforeScroll = await page.evaluate(() => {
    const elements = [];
    document.querySelectorAll('[class*="sr"], [class*="fade"], [class*="reveal"]').forEach(el => {
      const styles = window.getComputedStyle(el);
      elements.push({
        selector: el.className,
        transform: styles.transform,
        opacity: styles.opacity,
        top: el.getBoundingClientRect().top,
      });
    });
    return elements;
  });

  // Scroll down incrementally and check for changes
  for (let i = 0; i < 5; i++) {
    await page.evaluate(() => window.scrollBy(0, 500));
    await page.waitForTimeout(500);

    const afterScroll = await page.evaluate(() => {
      const elements = [];
      document.querySelectorAll('[class*="sr"], [class*="fade"], [class*="reveal"]').forEach(el => {
        const styles = window.getComputedStyle(el);
        elements.push({
          selector: el.className,
          transform: styles.transform,
          opacity: styles.opacity,
        });
      });
      return elements;
    });

    effects.scrollAnimations.push({
      scrollPosition: (i + 1) * 500,
      elements: afterScroll.slice(0, 10),
    });
  }

  // Scroll back to top
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);

  // 4. EXTRACT TRANSITION PROPERTIES
  console.log('\n📍 Extracting transition properties...');

  effects.transitions = await page.evaluate(() => {
    const transitions = [];
    const seen = new Set();

    document.querySelectorAll('*').forEach(el => {
      const styles = window.getComputedStyle(el);
      const transition = styles.transition;

      if (transition !== 'all 0s ease 0s' && !seen.has(transition)) {
        seen.add(transition);
        transitions.push({
          element: el.className || el.tagName,
          transition: styles.transition,
          transitionProperty: styles.transitionProperty,
          transitionDuration: styles.transitionDuration,
          transitionTimingFunction: styles.transitionTimingFunction,
          transitionDelay: styles.transitionDelay,
        });
      }
    });

    return transitions.slice(0, 50);
  });

  // 5. EXTRACT TRANSFORM EFFECTS
  console.log('\n📍 Extracting transform effects...');

  effects.transforms = await page.evaluate(() => {
    const transforms = [];

    document.querySelectorAll('*').forEach(el => {
      const styles = window.getComputedStyle(el);
      if (styles.transform !== 'none') {
        transforms.push({
          element: el.className || el.tagName,
          transform: styles.transform,
          transformOrigin: styles.transformOrigin,
          perspective: styles.perspective,
          backfaceVisibility: styles.backfaceVisibility,
        });
      }
    });

    return transforms.slice(0, 30);
  });

  // 6. CHECK FOR CURSOR/POINTER EFFECTS
  console.log('\n📍 Checking cursor effects...');

  effects.cursorEffects = await page.evaluate(() => {
    const cursors = [];
    const seen = new Set();

    document.querySelectorAll('*').forEach(el => {
      const styles = window.getComputedStyle(el);
      if (styles.cursor && styles.cursor !== 'auto' && !seen.has(styles.cursor)) {
        seen.add(styles.cursor);
        cursors.push({
          element: el.className || el.tagName,
          cursor: styles.cursor,
          pointerEvents: styles.pointerEvents,
        });
      }
    });

    return cursors;
  });

  // 7. EXTRACT FILTER/BACKDROP EFFECTS
  console.log('\n📍 Extracting filter and backdrop effects...');

  effects.filterEffects = await page.evaluate(() => {
    const filters = [];

    document.querySelectorAll('*').forEach(el => {
      const styles = window.getComputedStyle(el);
      if (styles.filter !== 'none' || styles.backdropFilter !== 'none') {
        filters.push({
          element: el.className || el.tagName,
          filter: styles.filter,
          backdropFilter: styles.backdropFilter,
        });
      }
    });

    return filters;
  });

  // 8. CAPTURE VIDEO/GIF ELEMENTS
  console.log('\n📍 Checking for video/GIF animations...');

  effects.mediaAnimations = await page.evaluate(() => {
    const media = [];

    document.querySelectorAll('video, [src*=".gif"], [style*="gif"]').forEach(el => {
      media.push({
        type: el.tagName,
        src: el.src || el.style.backgroundImage,
        autoplay: el.autoplay,
        loop: el.loop,
        className: el.className,
      });
    });

    return media;
  });

  // 9. EXTRACT INTERSECTION OBSERVER / LAZY LOAD EFFECTS
  console.log('\n📍 Checking for lazy-load/intersection effects...');

  effects.lazyLoadEffects = await page.evaluate(() => {
    const lazyElements = [];

    document.querySelectorAll('[loading="lazy"], [class*="lazy"], [data-src]').forEach(el => {
      const styles = window.getComputedStyle(el);
      lazyElements.push({
        element: el.className || el.tagName,
        loading: el.getAttribute('loading'),
        dataSrc: el.getAttribute('data-src'),
        transition: styles.transition,
      });
    });

    return lazyElements;
  });

  // 10. CAPTURE SPECIFIC ELEMENT INTERACTIONS
  console.log('\n📍 Testing specific interactions...');

  // Test menu button
  const menuButton = await page.locator('button.menu-button').first();
  if (await menuButton.count() > 0) {
    await menuButton.click();
    await page.waitForTimeout(1000);

    effects.interactionEffects.push({
      interaction: 'Menu Open',
      screenshot: 'captured',
    });

    await page.screenshot({ path: 'scripts/effect-menu-open.png' });

    // Close menu
    const closeButton = await page.locator('button.js--dialog__exit').first();
    if (await closeButton.count() > 0) {
      await closeButton.click();
      await page.waitForTimeout(500);
    }
  }

  // Create detailed markdown report
  const markdown = `# Upstatement Effects Analysis

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
${effect.before.transform !== effect.after.transform ? '- ✓ Transform changed' : ''}
${effect.before.opacity !== effect.after.opacity ? '- ✓ Opacity changed' : ''}
${effect.before.backgroundColor !== effect.after.backgroundColor ? '- ✓ Background color changed' : ''}
${effect.before.boxShadow !== effect.after.boxShadow ? '- ✓ Box shadow changed' : ''}
${effect.before.filter !== effect.after.filter ? '- ✓ Filter changed' : ''}
`).join('\n')}

## 2. CSS Animations & Keyframes

### Active Animations
${effects.cssAnimations.animations.slice(0, 20).map((anim, i) => `
#### Animation ${i + 1}: ${anim.element}
- Name: ${anim.animationName}
- Duration: ${anim.animationDuration}
- Timing Function: ${anim.animationTimingFunction}
- Delay: ${anim.animationDelay}
- Iteration Count: ${anim.animationIterationCount}
- Direction: ${anim.animationDirection}
- Fill Mode: ${anim.animationFillMode}
`).join('\n')}

### Keyframes
${effects.cssAnimations.keyframes.map((kf, i) => `
#### @keyframes ${kf.name}
${kf.frames.map(frame => `
**${frame.keyText}**
\`\`\`css
${frame.style}
\`\`\`
`).join('\n')}
`).join('\n')}

## 3. Scroll-Triggered Animations

${effects.scrollAnimations.map((scroll, i) => `
### At Scroll Position: ${scroll.scrollPosition}px
${scroll.elements.slice(0, 5).map(el => `
- **${el.selector}**
  - Transform: ${el.transform}
  - Opacity: ${el.opacity}
`).join('\n')}
`).join('\n')}

## 4. Transitions

${effects.transitions.slice(0, 30).map((trans, i) => `
### Transition ${i + 1}: ${trans.element}
- Property: ${trans.transitionProperty}
- Duration: ${trans.transitionDuration}
- Timing Function: ${trans.transitionTimingFunction}
- Delay: ${trans.transitionDelay}
- Full: \`${trans.transition}\`
`).join('\n')}

## 5. Transform Effects

${effects.transforms.slice(0, 20).map((trans, i) => `
### Transform ${i + 1}: ${trans.element}
- Transform: ${trans.transform}
- Origin: ${trans.transformOrigin}
- Perspective: ${trans.perspective}
`).join('\n')}

## 6. Cursor Effects

${effects.cursorEffects.map((cursor, i) => `
### ${cursor.element}
- Cursor: ${cursor.cursor}
- Pointer Events: ${cursor.pointerEvents}
`).join('\n')}

## 7. Filter & Backdrop Effects

${effects.filterEffects.map((filter, i) => `
### ${filter.element}
- Filter: ${filter.filter}
- Backdrop Filter: ${filter.backdropFilter}
`).join('\n')}

## 8. Media Animations (Videos/GIFs)

${effects.mediaAnimations.map((media, i) => `
### ${media.type} ${i + 1}
- Source: ${media.src}
- Autoplay: ${media.autoplay}
- Loop: ${media.loop}
- Class: ${media.className}
`).join('\n')}

## 9. Lazy Load / Intersection Effects

${effects.lazyLoadEffects.map((lazy, i) => `
### ${lazy.element}
- Loading: ${lazy.loading}
- Data Src: ${lazy.dataSrc}
- Transition: ${lazy.transition}
`).join('\n')}

## 10. Key Interaction Patterns

${effects.interactionEffects.map(interaction => `
### ${interaction.interaction}
- Screenshot saved to: scripts/effect-menu-open.png
`).join('\n')}

---

## Summary of Key Effects to Replicate

### Most Important Transitions:
1. **Image Zoom on Hover**: 7s cubic-bezier transform
2. **Link Hover**: Subtle opacity/color changes
3. **Button Hover**: Background/border color transitions
4. **Card Hover**: Box shadow or scale transforms
5. **Scroll Reveal**: Opacity and transform animations

### Animation Principles:
- **Timing**: Slow, deliberate animations (7s for images!)
- **Easing**: Custom cubic-bezier for smooth, organic feel
- **Subtlety**: Small changes, big impact
- **Performance**: Transform-based animations (GPU accelerated)

### Implementation Priority:
1. Set up base transitions on interactive elements
2. Add hover states to links, buttons, cards
3. Implement scroll-reveal animations
4. Add image zoom effects
5. Fine-tune timing and easing functions

---

*Effects extraction completed on ${new Date().toISOString()}*
*Screenshots saved in scripts/ directory*
`;

  // Append to design system file
  const existingContent = fs.readFileSync('frontend/design-system.md', 'utf8');
  fs.writeFileSync('frontend/design-system.md', existingContent + '\n\n---\n\n' + markdown);

  console.log('\n✅ All effects documented in frontend/design-system.md');
  console.log('✅ Screenshots saved in scripts/');

  await browser.close();
}

extractAllEffects().catch(console.error);
