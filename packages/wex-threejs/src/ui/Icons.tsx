import React from 'react';

/**
 * Minimal flat monochrome icons for WexThreeJS
 * All icons are 24x24 viewBox with 2px stroke
 */

interface IconProps {
  size?: number;
  className?: string;
}

const Icon: React.FC<IconProps & { children: React.ReactNode }> = ({ 
  size = 18, 
  className = '',
  children 
}) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    className={className}
  >
    {children}
  </svg>
);

// Navigation & View
export const IconHome: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
    <path d="M9 22V12h6v10"/>
  </Icon>
);

export const IconZoomFit: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
  </Icon>
);

export const IconReset: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8"/>
    <path d="M3 3v5h5"/>
  </Icon>
);

export const IconViews: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="3"/>
    <path d="M2 12s4-8 10-8 10 8 10 8-4 8-10 8-10-8-10-8z"/>
  </Icon>
);

export const IconCube: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
    <path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12"/>
  </Icon>
);

// Arrows for views
export const IconArrowUp: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <path d="M12 19V5M5 12l7-7 7 7"/>
  </Icon>
);

export const IconArrowDown: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <path d="M12 5v14M19 12l-7 7-7-7"/>
  </Icon>
);

export const IconArrowLeft: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <path d="M19 12H5M12 19l-7-7 7-7"/>
  </Icon>
);

export const IconArrowRight: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <path d="M5 12h14M12 5l7 7-7 7"/>
  </Icon>
);

// Tools
export const IconGrid: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <rect x="3" y="3" width="18" height="18"/>
    <path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>
  </Icon>
);

export const IconXRay: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <rect x="3" y="3" width="18" height="18" rx="2" opacity="0.4"/>
    <rect x="7" y="7" width="10" height="10" rx="1"/>
  </Icon>
);

// Selection
export const IconEye: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <path d="M2 12s4-8 10-8 10 8 10 8-4 8-10 8-10-8-10-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </Icon>
);

export const IconEyeOff: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
    <path d="M1 1l22 22"/>
  </Icon>
);

export const IconIsolate: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <path d="M22 3H2l8 9.46V19l4 2v-8.54z"/>
  </Icon>
);

export const IconClear: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="10"/>
    <path d="M15 9l-6 6M9 9l6 6"/>
  </Icon>
);

// Section/Clip
export const IconScissors: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <circle cx="6" cy="6" r="3"/>
    <circle cx="6" cy="18" r="3"/>
    <path d="M20 4L8.12 15.88M14.47 14.48L20 20M8.12 8.12L12 12"/>
  </Icon>
);

export const IconBox: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <path d="M21 8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
  </Icon>
);

// Theme
export const IconMoon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
  </Icon>
);

export const IconSun: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="5"/>
    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
  </Icon>
);

// UI
export const IconChevronDown: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <path d="M6 9l6 6 6-6"/>
  </Icon>
);

export const IconMenu: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <path d="M3 12h18M3 6h18M3 18h18"/>
  </Icon>
);

export const IconFolder: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
  </Icon>
);

export const IconFile: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
    <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
  </Icon>
);

export const IconLink: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
  </Icon>
);

export const IconClose: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <path d="M18 6L6 18M6 6l12 12"/>
  </Icon>
);

export const IconPackage: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
    <path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12"/>
  </Icon>
);

export const IconTarget: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="10"/>
    <circle cx="12" cy="12" r="6"/>
    <circle cx="12" cy="12" r="2"/>
  </Icon>
);

export const IconDownload: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
    <path d="M7 10l5 5 5-5M12 15V3"/>
  </Icon>
);

export const IconAlert: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
    <path d="M12 9v4M12 17h.01"/>
  </Icon>
);

// Export all icons
export const Icons = {
  Home: IconHome,
  ZoomFit: IconZoomFit,
  Reset: IconReset,
  Views: IconViews,
  Cube: IconCube,
  ArrowUp: IconArrowUp,
  ArrowDown: IconArrowDown,
  ArrowLeft: IconArrowLeft,
  ArrowRight: IconArrowRight,
  Grid: IconGrid,
  XRay: IconXRay,
  Eye: IconEye,
  EyeOff: IconEyeOff,
  Isolate: IconIsolate,
  Clear: IconClear,
  Scissors: IconScissors,
  Box: IconBox,
  Moon: IconMoon,
  Sun: IconSun,
  ChevronDown: IconChevronDown,
  Menu: IconMenu,
  Folder: IconFolder,
  File: IconFile,
  Link: IconLink,
  Close: IconClose,
  Package: IconPackage,
  Target: IconTarget,
  Download: IconDownload,
  Alert: IconAlert,
};

export default Icons;
