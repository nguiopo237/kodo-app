import React, { createContext, useContext } from 'react';

// ============================================
// TYPOGRAPHY SERVICE — Design System KodoMarket
// ============================================

export const FONT_FAMILIES = {
  DISPLAY: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  BODY: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  MONO: '"JetBrains Mono", source-code-pro, Menlo, Monaco, monospace',
};

export const FONT_SIZES = {
  xs: '0.75rem',
  sm: '0.875rem',
  base: '1rem',
  lg: '1.125rem',
  xl: '1.25rem',
  '2xl': '1.5rem',
  '3xl': '1.875rem',
  '4xl': '2.25rem',
  '5xl': '3rem',
  '6xl': '3.75rem',
};

export const FONT_WEIGHTS = {
  light: 300,
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
  black: 900,
};

export const LINE_HEIGHTS = {
  none: 1,
  tight: 1.25,
  snug: 1.375,
  normal: 1.5,
  relaxed: 1.625,
  loose: 2,
};

export const LETTER_SPACINGS = {
  tighter: '-0.05em',
  tight: '-0.025em',
  normal: '0',
  wide: '0.025em',
  wider: '0.05em',
  widest: '0.1em',
};

export const TEXT_STYLES = {
  h1: {
    fontFamily: FONT_FAMILIES.DISPLAY,
    fontSize: FONT_SIZES['4xl'],
    fontWeight: FONT_WEIGHTS.bold,
    lineHeight: LINE_HEIGHTS.tight,
    letterSpacing: LETTER_SPACINGS.tight,
  },
  h2: {
    fontFamily: FONT_FAMILIES.DISPLAY,
    fontSize: FONT_SIZES['3xl'],
    fontWeight: FONT_WEIGHTS.bold,
    lineHeight: LINE_HEIGHTS.tight,
    letterSpacing: LETTER_SPACINGS.tight,
  },
  h3: {
    fontFamily: FONT_FAMILIES.DISPLAY,
    fontSize: FONT_SIZES['2xl'],
    fontWeight: FONT_WEIGHTS.semibold,
    lineHeight: LINE_HEIGHTS.snug,
  },
  h4: {
    fontFamily: FONT_FAMILIES.DISPLAY,
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.semibold,
    lineHeight: LINE_HEIGHTS.snug,
  },
  body: {
    fontFamily: FONT_FAMILIES.BODY,
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.regular,
    lineHeight: LINE_HEIGHTS.relaxed,
  },
  bodySm: {
    fontFamily: FONT_FAMILIES.BODY,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.regular,
    lineHeight: LINE_HEIGHTS.normal,
  },
  bodyXs: {
    fontFamily: FONT_FAMILIES.BODY,
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.regular,
    lineHeight: LINE_HEIGHTS.normal,
  },
  mono: {
    fontFamily: FONT_FAMILIES.MONO,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    letterSpacing: LETTER_SPACINGS.wide,
  },
};

export const getResponsiveFontSize = (size, breakpoint = 'desktop') => {
  const sizes = {
    desktop: { xs: '0.75rem', sm: '0.875rem', base: '1rem', lg: '1.125rem', xl: '1.25rem', '2xl': '1.5rem', '3xl': '1.875rem', '4xl': '2.25rem' },
    tablet: { xs: '0.75rem', sm: '0.875rem', base: '1rem', lg: '1.125rem', xl: '1.25rem', '2xl': '1.375rem', '3xl': '1.5rem', '4xl': '1.875rem' },
    mobile: { xs: '0.75rem', sm: '0.875rem', base: '1rem', lg: '1rem', xl: '1.125rem', '2xl': '1.25rem', '3xl': '1.375rem', '4xl': '1.5rem' },
  };
  return sizes[breakpoint]?.[size] || FONT_SIZES[size] || size;
};

export const getTextStyle = (variant) => {
  return TEXT_STYLES[variant] || TEXT_STYLES.body;
};

export const generateTypographyInline = (variant, overrides = {}) => {
  const base = getTextStyle(variant);
  return { ...base, ...overrides };
};

// React Context pour la typographie
const TypographyContext = createContext({
  fontFamilies: FONT_FAMILIES,
  fontSizes: FONT_SIZES,
  fontWeights: FONT_WEIGHTS,
  lineHeights: LINE_HEIGHTS,
  letterSpacings: LETTER_SPACINGS,
  textStyles: TEXT_STYLES,
  getTextStyle,
  generateTypographyInline,
});

export const useTypography = () => useContext(TypographyContext);

export const TypographyProvider = ({ children }) => {
  const value = {
    fontFamilies: FONT_FAMILIES,
    fontSizes: FONT_SIZES,
    fontWeights: FONT_WEIGHTS,
    lineHeights: LINE_HEIGHTS,
    letterSpacings: LETTER_SPACINGS,
    textStyles: TEXT_STYLES,
    getTextStyle,
    generateTypographyInline,
  };

  return React.createElement(
    TypographyContext.Provider,
    { value },
    children
  );
};

export default {
  FONT_FAMILIES,
  FONT_SIZES,
  FONT_WEIGHTS,
  LINE_HEIGHTS,
  LETTER_SPACINGS,
  TEXT_STYLES,
  getResponsiveFontSize,
  getTextStyle,
  generateTypographyInline,
  TypographyProvider,
  useTypography,
};
