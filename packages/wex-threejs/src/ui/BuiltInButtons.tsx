import React from 'react';
import type { 
  ToolbarButton, 
  ToolbarToggleButton, 
  ToolbarButtonGroup, 
  WexViewerRef 
} from '../types';
import {
  IconHome,
  IconZoomFit,
  IconReset,
  IconViews,
  IconCube,
  IconArrowUp,
  IconArrowDown,
  IconArrowLeft,
  IconArrowRight,
  IconGrid,
  IconXRay,
  IconEye,
  IconEyeOff,
  IconIsolate,
  IconClear,
  IconScissors,
  IconBox,
  IconMoon,
  IconSun,
} from './Icons';

// Re-export icons
export { Icons } from './Icons';

// Type alias for viewer ref (allows null)
type ViewerRef = React.RefObject<WexViewerRef | null>;

/**
 * Toolbar dropdown type (extends button group with dropdown behavior)
 */
export interface ToolbarDropdown {
  type: 'dropdown';
  id: string;
  icon?: React.ReactNode;
  label?: string;
  tooltip?: string;
  items: ToolbarButton[];
  className?: string;
}

/**
 * Creates a zoom to fit button
 */
export function createZoomFitButton(viewer: ViewerRef): ToolbarButton {
  return {
    type: 'button',
    id: 'zoom-fit',
    icon: <IconZoomFit />,
    tooltip: 'Zoom to Fit',
    onClick: () => viewer.current?.zoomFit(),
  };
}

/**
 * Creates a reset view button
 */
export function createResetButton(viewer: ViewerRef): ToolbarButton {
  return {
    type: 'button',
    id: 'reset',
    icon: <IconReset />,
    tooltip: 'Reset View',
    onClick: () => viewer.current?.reset(),
  };
}

/**
 * Creates a home button
 */
export function createHomeButton(viewer: ViewerRef): ToolbarButton {
  return {
    type: 'button',
    id: 'home',
    icon: <IconHome />,
    tooltip: 'Home View',
    onClick: () => viewer.current?.setView('iso'),
  };
}

/**
 * Creates a clear selection button
 */
export function createClearSelectionButton(viewer: ViewerRef): ToolbarButton {
  return {
    type: 'button',
    id: 'clear-selection',
    icon: <IconClear />,
    tooltip: 'Clear Selection',
    onClick: () => viewer.current?.clearSelection(),
  };
}

/**
 * Creates a views dropdown with preset camera angles
 */
export function createViewsDropdown(viewer: ViewerRef): ToolbarDropdown {
  return {
    type: 'dropdown',
    id: 'views-dropdown',
    icon: <IconViews />,
    tooltip: 'Camera Views',
    items: [
      {
        type: 'button',
        id: 'view-front',
        icon: <IconArrowUp />,
        tooltip: 'Front',
        onClick: () => viewer.current?.setView('front'),
      },
      {
        type: 'button',
        id: 'view-back',
        icon: <IconArrowDown />,
        tooltip: 'Back',
        onClick: () => viewer.current?.setView('back'),
      },
      {
        type: 'button',
        id: 'view-left',
        icon: <IconArrowLeft />,
        tooltip: 'Left',
        onClick: () => viewer.current?.setView('left'),
      },
      {
        type: 'button',
        id: 'view-right',
        icon: <IconArrowRight />,
        tooltip: 'Right',
        onClick: () => viewer.current?.setView('right'),
      },
      {
        type: 'button',
        id: 'view-top',
        icon: <IconArrowUp />,
        tooltip: 'Top',
        onClick: () => viewer.current?.setView('top'),
      },
      {
        type: 'button',
        id: 'view-bottom',
        icon: <IconArrowDown />,
        tooltip: 'Bottom',
        onClick: () => viewer.current?.setView('bottom'),
      },
      {
        type: 'button',
        id: 'view-iso',
        icon: <IconCube />,
        tooltip: 'Isometric',
        onClick: () => viewer.current?.setView('iso'),
      },
    ],
  };
}

/**
 * Creates view preset buttons group (non-dropdown version)
 */
export function createViewsButtonGroup(viewer: ViewerRef): ToolbarButtonGroup {
  return {
    type: 'group',
    id: 'views-group',
    label: 'Views',
    items: [
      {
        type: 'button',
        id: 'view-front',
        icon: <span style={{ fontSize: 11, fontWeight: 600 }}>F</span>,
        tooltip: 'Front View',
        onClick: () => viewer.current?.setView('front'),
      },
      {
        type: 'button',
        id: 'view-top',
        icon: <span style={{ fontSize: 11, fontWeight: 600 }}>T</span>,
        tooltip: 'Top View',
        onClick: () => viewer.current?.setView('top'),
      },
      {
        type: 'button',
        id: 'view-iso',
        icon: <IconCube size={14} />,
        tooltip: 'Isometric View',
        onClick: () => viewer.current?.setView('iso'),
      },
    ],
  };
}

/**
 * Creates an X-Ray mode toggle
 */
export function createXRayToggle(
  isActive: boolean,
  onToggle: (active: boolean) => void
): ToolbarToggleButton {
  return {
    type: 'toggle',
    id: 'xray-toggle',
    icon: <IconXRay />,
    tooltip: isActive ? 'Disable X-Ray' : 'X-Ray Mode',
    isToggled: isActive,
    onToggle,
  };
}

/**
 * Creates a grid toggle
 */
export function createGridToggle(
  isActive: boolean,
  onToggle: (active: boolean) => void
): ToolbarToggleButton {
  return {
    type: 'toggle',
    id: 'grid-toggle',
    icon: <IconGrid />,
    tooltip: isActive ? 'Hide Grid' : 'Show Grid',
    isToggled: isActive,
    onToggle,
  };
}

/**
 * Creates a hide selected elements toggle
 */
export function createHideToggle(
  viewer: ViewerRef,
  getSelectedElements: () => number[],
  isHidden: boolean,
  onToggle: (hidden: boolean) => void
): ToolbarToggleButton {
  return {
    type: 'toggle',
    id: 'hide-toggle',
    icon: <IconEyeOff />,
    toggledIcon: <IconEye />,
    tooltip: isHidden ? 'Show Selected' : 'Hide Selected',
    isToggled: isHidden,
    onToggle: (hidden) => {
      const selected = getSelectedElements();
      if (selected.length > 0) {
        if (hidden) {
          viewer.current?.hideElements(selected);
        } else {
          viewer.current?.showElements(selected);
        }
      }
      onToggle(hidden);
    },
  };
}

/**
 * Creates an isolate selected elements toggle
 */
export function createIsolateToggle(
  viewer: ViewerRef,
  getSelectedElements: () => number[],
  isIsolated: boolean,
  onToggle: (isolated: boolean) => void
): ToolbarToggleButton {
  return {
    type: 'toggle',
    id: 'isolate-toggle',
    icon: <IconIsolate />,
    tooltip: isIsolated ? 'Show All' : 'Isolate Selected',
    isToggled: isIsolated,
    onToggle: (isolated) => {
      if (isolated) {
        const selected = getSelectedElements();
        if (selected.length > 0) {
          viewer.current?.isolateElements(selected);
        }
      } else {
        viewer.current?.unisolateElements();
      }
      onToggle(isolated);
    },
  };
}

/**
 * Creates a section box control button group
 */
export function createSectionBoxButtons(
  isEnabled: boolean,
  isVisible: boolean,
  onEnableToggle: (enabled: boolean) => void,
  onVisibilityToggle: (visible: boolean) => void
): ToolbarButtonGroup {
  return {
    type: 'group',
    id: 'section-box-group',
    label: 'Section',
    items: [
      {
        type: 'toggle',
        id: 'section-box-enable',
        icon: <IconBox />,
        tooltip: isEnabled ? 'Disable Section Box' : 'Enable Section Box',
        isToggled: isEnabled,
        onToggle: onEnableToggle,
      } as ToolbarToggleButton,
      {
        type: 'toggle',
        id: 'section-box-visibility',
        icon: isVisible ? <IconEye /> : <IconEyeOff />,
        tooltip: isVisible ? 'Hide Section Box' : 'Show Section Box',
        isToggled: isVisible,
        disabled: !isEnabled,
        onToggle: onVisibilityToggle,
      } as ToolbarToggleButton,
    ],
  };
}

/**
 * Creates a clipping plane control button group
 */
export function createClippingPlaneButtons(
  isEnabled: boolean,
  isVisible: boolean,
  onEnableToggle: (enabled: boolean) => void,
  onVisibilityToggle: (visible: boolean) => void
): ToolbarButtonGroup {
  return {
    type: 'group',
    id: 'clipping-plane-group',
    label: 'Clip',
    items: [
      {
        type: 'toggle',
        id: 'clipping-plane-enable',
        icon: <IconScissors />,
        tooltip: isEnabled ? 'Disable Clipping' : 'Enable Clipping',
        isToggled: isEnabled,
        onToggle: onEnableToggle,
      } as ToolbarToggleButton,
      {
        type: 'toggle',
        id: 'clipping-plane-visibility',
        icon: isVisible ? <IconEye /> : <IconEyeOff />,
        tooltip: isVisible ? 'Hide Clip Plane' : 'Show Clip Plane',
        isToggled: isVisible,
        disabled: !isEnabled,
        onToggle: onVisibilityToggle,
      } as ToolbarToggleButton,
    ],
  };
}

/**
 * Creates a theme toggle button
 */
export function createThemeToggle(
  isDark: boolean,
  onToggle: (dark: boolean) => void
): ToolbarToggleButton {
  return {
    type: 'toggle',
    id: 'theme-toggle',
    icon: <IconMoon />,
    toggledIcon: <IconSun />,
    tooltip: isDark ? 'Light Mode' : 'Dark Mode',
    isToggled: isDark,
    onToggle,
  };
}

// Default export with all button factories
export const BuiltInButtons = {
  createZoomFitButton,
  createResetButton,
  createHomeButton,
  createClearSelectionButton,
  createViewsDropdown,
  createViewsButtonGroup,
  createXRayToggle,
  createGridToggle,
  createHideToggle,
  createIsolateToggle,
  createSectionBoxButtons,
  createClippingPlaneButtons,
  createThemeToggle,
};

export default BuiltInButtons;
