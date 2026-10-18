// VooDoo Design Tokens extracted directly from Overview.png
// Primary ramp, Neutral ramp, Info ramp, Success ramp, Warning ramp, Danger ramp

export const colors = {
  primary: {
    50: '#f2f8fd',
    100: '#e5f2fb',
    200: '#c1e5ff',
    300: '#90cdf9',
    400: '#45b0fc',
    500: '#0597ff', // Base action blue
    600: '#0180da',
    700: '#0368b0',
    800: '#054c7f',
    900: '#072f4b',
    950: '#061a28'
  },
  neutral: {
    50: '#f7f7f8',  // App background
    100: '#ecedee', // Subtle secondary buttons/tags
    200: '#dadcdd', // Card borders & dividers
    300: '#bcc0c2',
    400: '#989fa4', // Tertiary muted text
    500: '#788187', // Secondary muted text
    600: '#656c72',
    700: '#51585c',
    800: '#3e4346',
    900: '#27292b', // Primary text
    950: '#161718'
  },
  info: {
    50: '#fdf2f3',
    100: '#fbe5e8',
    200: '#f9c8ce',
    300: '#ff8f9d',
    400: '#fc4a62',
    500: '#ff0a2b',
    600: '#df011f',
    700: '#b0031a',
    800: '#840616',
    900: '#4b0710',
    950: '#28060a'
  },
  success: {
    50: '#f4fbf7',
    100: '#e4f6ec',
    200: '#ccf0db',
    300: '#a1e8be',
    400: '#70e19f',
    500: '#3fd97f',
    600: '#27c468',
    700: '#219c54',
    800: '#1b7440',
    900: '#134427',
    950: '#0b2315'
  },
  warning: {
    50: '#fdf8f2',
    100: '#faf0e0',
    200: '#f9e1be',
    300: '#f9cd8a',
    400: '#ffb341',
    500: '#ff9b05',
    600: '#da8301',
    700: '#ab6803',
    800: '#7f4e05',
    900: '#4b3007',
    950: '#281a06'
  },
  danger: {
    50: '#fdf2f2',
    100: '#fae0e0',
    200: '#f9bebe',
    300: '#f98585',
    400: '#fd3f3f',
    500: '#ff0000',
    600: '#d50101',
    700: '#aa0303',
    800: '#7f0505',
    900: '#4b0707',
    950: '#280606'
  }
};

export const typography = {
  h1: {
    fontSize: '48px',
    lineHeight: '1.15',
    fontWeight: '700',
    letterSpacing: '-0.02em'
  },
  h2: {
    fontSize: '36px',
    lineHeight: '1.2',
    fontWeight: '700',
    letterSpacing: '-0.015em'
  },
  h3: {
    fontSize: '28px',
    lineHeight: '1.3',
    fontWeight: '500',
    letterSpacing: '-0.01em'
  },
  body: {
    fontSize: '16px',
    lineHeight: '1.5',
    fontWeight: '400'
  },
  label: {
    fontSize: '12px',
    lineHeight: '1.3',
    fontWeight: '600',
    letterSpacing: '0.04em',
    textTransform: 'uppercase'
  }
};

export const spacing = {
  base: 4,
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px'
};

export const lightTheme = {
  background: colors.neutral[50],
  cardBackground: '#ffffff',
  borderColor: colors.neutral[200],
  textPrimary: colors.neutral[900],
  textSecondary: colors.neutral[500],
  textTertiary: colors.neutral[400],
  actionPrimary: colors.primary[500],
  actionHover: colors.primary[600],
  actionText: '#ffffff',
  secondaryButtonBg: colors.neutral[100],
  secondaryButtonText: colors.neutral[900]
};

export default {
  colors,
  typography,
  spacing,
  lightTheme
};
