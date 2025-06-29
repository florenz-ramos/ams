'use client';
import React from 'react';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';

interface ThemeButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'outline' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const ThemeButton: React.FC<ThemeButtonProps> = ({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}) => {
  const { theme } = useTheme();

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: theme.primary_color,
          color: '#ffffff',
          borderColor: theme.primary_color
        };
      case 'secondary':
        return {
          backgroundColor: theme.secondary_color,
          color: '#000000',
          borderColor: theme.secondary_color
        };
      case 'accent':
        return {
          backgroundColor: theme.accent_color,
          color: '#000000',
          borderColor: theme.accent_color
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          color: theme.primary_color,
          borderColor: theme.primary_color
        };
      case 'destructive':
        return {
          backgroundColor: '#ef4444',
          color: '#ffffff',
          borderColor: '#ef4444'
        };
      default:
        return {};
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'px-3 py-1.5 text-sm';
      case 'md':
        return 'px-4 py-2 text-base';
      case 'lg':
        return 'px-6 py-3 text-lg';
      default:
        return 'px-4 py-2 text-base';
    }
  };

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background',
        getSizeStyles(),
        className
      )}
      style={getVariantStyles()}
      {...props}
    >
      {children}
    </button>
  );
}; 