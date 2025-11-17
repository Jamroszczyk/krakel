/**
 * Central color theme for Krakel
 * All colors used throughout the app should be defined here
 */

export const colors = {
  // Primary Colors
  primary: {
    main: '#B404FD',        // Main purple - used for particles, accents
    light: '#E095FF',       // Light purple - used for buttons
    lighter: '#F1CEFF',     // Very light purple - completion background
  },

  // Secondary Colors  
  secondary: {
    green: '#B404FD',       // Progress indicator color
    blue: '#B404FD',        // Selection color
  },

  // Neutral Colors
  neutral: {
    white: '#ffffff',
    gray50: '#f9fafb',
    gray100: '#f3f4f6',
    gray200: '#e5e7eb',
    gray400: '#9ca3af',
    gray500: '#6b7280',
    gray600: '#4b5563',
    gray700: '#374151',
    gray800: '#1f2937',
    gray900: '#111827',
  },

  // Semantic Colors
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',

  // Edge Colors
  edge: '#94a3b8',
} as const;

// Type for autocomplete
export type ThemeColors = typeof colors;

