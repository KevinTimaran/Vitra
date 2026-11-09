import test from 'node:test';
import assert from 'node:assert/strict';

// Test suite for LiquidGlassView pure styling & layout separation logic
const OUTER_STYLE_KEYS = new Set([
  'margin',
  'marginTop',
  'marginBottom',
  'marginLeft',
  'marginRight',
  'marginHorizontal',
  'marginVertical',
  'alignSelf',
  'position',
  'top',
  'bottom',
  'left',
  'right',
  'zIndex',
  'flex',
  'flexGrow',
  'flexShrink',
  'width',
  'height',
  'minWidth',
  'minHeight',
  'maxWidth',
  'maxHeight',
  'opacity',
  'transform',
  'shadowColor',
  'shadowOffset',
  'shadowOpacity',
  'shadowRadius',
  'elevation',
]);

function computeLiquidGlassStyles({
  style = {},
  intensity = 80,
  tint,
  isDark = false,
  borderRadius = 24,
  borderWidth = 1,
  borderColor,
  backgroundColor,
  hasShadow = true,
}) {
  const flattenedStyle = Array.isArray(style)
    ? Object.assign({}, ...style.filter(Boolean))
    : (style || {});

  const outerStyle = {};
  const innerStyle = {};

  const resolvedBorderRadius =
    typeof flattenedStyle.borderRadius === 'number'
      ? flattenedStyle.borderRadius
      : borderRadius;

  Object.entries(flattenedStyle).forEach(([key, value]) => {
    if (OUTER_STYLE_KEYS.has(key)) {
      outerStyle[key] = value;
    } else if (
      key !== 'borderRadius' &&
      key !== 'borderWidth' &&
      key !== 'borderColor' &&
      key !== 'backgroundColor'
    ) {
      innerStyle[key] = value;
    }
  });

  const defaultBorderColor = 'rgba(255, 255, 255, 0.2)';
  const resolvedBorderColor =
    borderColor || flattenedStyle.borderColor || defaultBorderColor;

  const resolvedBorderWidth =
    typeof flattenedStyle.borderWidth === 'number'
      ? flattenedStyle.borderWidth
      : borderWidth;

  const defaultBgColor = isDark
    ? 'rgba(20, 22, 28, 0.50)'
    : 'rgba(255, 255, 255, 0.60)';
  const resolvedBgColor =
    backgroundColor || flattenedStyle.backgroundColor || defaultBgColor;

  const shadowStyle = hasShadow
    ? {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: isDark ? 0.30 : 0.08,
        shadowRadius: 18,
        elevation: 4,
      }
    : {};

  const effectiveTint = tint || (isDark ? 'dark' : 'light');

  return {
    intensity,
    effectiveTint,
    resolvedBorderRadius,
    resolvedBorderWidth,
    resolvedBorderColor,
    resolvedBgColor,
    outerStyle: {
      ...shadowStyle,
      ...outerStyle,
      borderRadius: resolvedBorderRadius,
      backgroundColor: 'transparent',
    },
    innerStyle: {
      borderRadius: resolvedBorderRadius,
      backgroundColor: resolvedBgColor,
      borderColor: resolvedBorderColor,
      borderWidth: resolvedBorderWidth,
      ...innerStyle,
    },
  };
}

test('LiquidGlassView provides Glisse aesthetic defaults (intensity 80, radius 24, border 1, borderColor rgba(255,255,255,0.2))', () => {
  const result = computeLiquidGlassStyles({});
  assert.strictEqual(result.intensity, 80);
  assert.strictEqual(result.resolvedBorderRadius, 24);
  assert.strictEqual(result.resolvedBorderWidth, 1);
  assert.strictEqual(result.resolvedBorderColor, 'rgba(255, 255, 255, 0.2)');
  assert.strictEqual(result.effectiveTint, 'light');
  assert.strictEqual(result.outerStyle.shadowColor, '#000000');
  assert.strictEqual(result.outerStyle.backgroundColor, 'transparent');
});

test('LiquidGlassView adapts defaults for dark mode', () => {
  const result = computeLiquidGlassStyles({ isDark: true });
  assert.strictEqual(result.effectiveTint, 'dark');
  assert.strictEqual(result.resolvedBorderColor, 'rgba(255, 255, 255, 0.2)');
  assert.strictEqual(result.resolvedBgColor, 'rgba(20, 22, 28, 0.50)');
  assert.strictEqual(result.outerStyle.shadowOpacity, 0.30);
});

test('LiquidGlassView properly splits layout/shadow keys to outer wrapper and padding/alignment to inner surface', () => {
  const style = {
    marginHorizontal: 16,
    marginTop: 8,
    width: 320,
    height: 120,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  };

  const result = computeLiquidGlassStyles({ style });

  // Outer wrapper receives positioning, dimension and margin
  assert.strictEqual(result.outerStyle.marginHorizontal, 16);
  assert.strictEqual(result.outerStyle.marginTop, 8);
  assert.strictEqual(result.outerStyle.width, 320);
  assert.strictEqual(result.outerStyle.height, 120);
  assert.strictEqual(result.outerStyle.zIndex, 10);
  assert.strictEqual(result.outerStyle.padding, undefined);

  // Inner surface receives padding and flex alignments
  assert.strictEqual(result.innerStyle.padding, 20);
  assert.strictEqual(result.innerStyle.alignItems, 'center');
  assert.strictEqual(result.innerStyle.justifyContent, 'space-between');
  assert.strictEqual(result.innerStyle.marginHorizontal, undefined);
});

test('LiquidGlassView respects custom borderColor, backgroundColor, and borderRadius overrides', () => {
  const custom = computeLiquidGlassStyles({
    borderRadius: 32,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.75)',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    intensity: 95,
  });

  assert.strictEqual(custom.intensity, 95);
  assert.strictEqual(custom.resolvedBorderRadius, 32);
  assert.strictEqual(custom.resolvedBorderWidth, 2);
  assert.strictEqual(custom.resolvedBorderColor, 'rgba(255, 255, 255, 0.75)');
  assert.strictEqual(custom.resolvedBgColor, 'rgba(255, 255, 255, 0.25)');
});

test('LiquidGlassView correctly handles empty, null or array styles without crashing', () => {
  const empty = computeLiquidGlassStyles({ style: null });
  assert.strictEqual(empty.resolvedBorderRadius, 24);

  const arrayStyle = computeLiquidGlassStyles({
    style: [{ margin: 10 }, null, { padding: 15 }],
  });
  assert.strictEqual(arrayStyle.outerStyle.margin, 10);
  assert.strictEqual(arrayStyle.innerStyle.padding, 15);
});
