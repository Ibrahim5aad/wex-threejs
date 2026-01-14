import React, { useState } from 'react';
import type { ToolbarItem, ViewerToolbarProps, ToolbarButton } from '../types';
import { IconChevronDown } from './Icons';
import './viewer-toolbar.css';

// Extended type for dropdown items
interface ToolbarDropdownItem {
  type: 'dropdown';
  id: string;
  icon?: React.ReactNode;
  label?: string;
  tooltip?: string;
  items: ToolbarButton[];
  className?: string;
  disabled?: boolean;
}

type ExtendedToolbarItem = ToolbarItem | ToolbarDropdownItem;

interface ExtendedViewerToolbarProps extends Omit<ViewerToolbarProps, 'items'> {
  items?: ExtendedToolbarItem[];
}

/**
 * ViewerToolbar - A toolbar component for viewer controls
 * Supports: buttons, toggles, groups, dropdowns, separators
 */
export const ViewerToolbar: React.FC<ExtendedViewerToolbarProps> = ({
  items = [],
  position = 'bottom',
  alignment = 'center',
  className,
  children,
}) => {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const toggleDropdown = (id: string) => {
    setOpenDropdown(prev => prev === id ? null : id);
  };

  const closeDropdown = () => {
    setOpenDropdown(null);
  };

  const renderItem = (item: ExtendedToolbarItem, index: number): React.ReactNode => {
    if (item.type === 'separator') {
      return <div key={`sep-${index}`} className="wex-toolbar-separator" />;
    }

    // Handle dropdown
    if (item.type === 'dropdown') {
      const dropdown = item as ToolbarDropdownItem;
      const isOpen = openDropdown === dropdown.id;
      
      return (
        <div key={dropdown.id} className={`wex-toolbar-dropdown ${dropdown.className || ''}`}>
          <button
            className={`wex-toolbar-btn wex-toolbar-dropdown-btn ${isOpen ? 'open' : ''}`}
            title={dropdown.tooltip}
            onClick={() => toggleDropdown(dropdown.id)}
            disabled={dropdown.disabled}
          >
            {dropdown.icon}
            <IconChevronDown size={12} />
          </button>
          {isOpen && (
            <div className="wex-toolbar-dropdown-menu">
              {dropdown.items.map((menuItem, i) => (
                <button
                  key={menuItem.id || i}
                  className="wex-toolbar-dropdown-item"
                  title={menuItem.tooltip}
                  disabled={menuItem.disabled}
                  onClick={() => {
                    menuItem.onClick();
                    closeDropdown();
                  }}
                >
                  {menuItem.icon}
                  <span>{menuItem.tooltip || menuItem.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (item.type === 'group') {
      return (
        <div key={item.id} className={`wex-toolbar-group ${item.className || ''}`}>
          {item.label && <span className="wex-toolbar-group-label">{item.label}</span>}
          <div className="wex-toolbar-group-items">
            {item.items.map((groupItem, i) => renderItem(groupItem as ExtendedToolbarItem, i))}
          </div>
        </div>
      );
    }

    if (item.type === 'toggle') {
      return (
        <button
          key={item.id}
          className={`wex-toolbar-btn ${item.isToggled ? 'active' : ''} ${item.disabled ? 'disabled' : ''} ${item.className || ''}`}
          title={item.tooltip}
          disabled={item.disabled}
          onClick={() => item.onToggle(!item.isToggled)}
        >
          {item.isToggled && item.toggledIcon ? item.toggledIcon : item.icon}
        </button>
      );
    }

    // Regular button
    return (
      <button
        key={item.id}
        className={`wex-toolbar-btn ${item.disabled ? 'disabled' : ''} ${item.className || ''}`}
        title={item.tooltip}
        disabled={item.disabled}
        onClick={item.onClick}
      >
        {item.icon}
        {item.label && <span className="wex-toolbar-btn-label">{item.label}</span>}
      </button>
    );
  };

  return (
    <div 
      className={`wex-toolbar wex-toolbar-${position} wex-toolbar-${alignment} ${className || ''}`}
      onMouseLeave={closeDropdown}
    >
      {items.map((item, index) => renderItem(item, index))}
      {children}
    </div>
  );
};

export default ViewerToolbar;
