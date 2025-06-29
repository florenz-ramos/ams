# Theme Implementation Guide

This guide explains how to implement and use the organization theme system across your application.

## Overview

The theme system allows each organization to customize their visual appearance with:
- **Primary Color**: Used for buttons and primary actions (default: PUP Maroon #800020)
- **Secondary Color**: Used for borders and secondary elements (default: PUP Gold #D4AF37)
- **Accent Color**: Used for success messages and highlights (default: Bright Gold #FFD700)
- **Text Color**: Used for labels and text content (default: Dark Gray #1f2937)

## Architecture

### 1. Theme Context (`src/context/ThemeContext.tsx`)
- Manages theme state globally
- Fetches theme from database based on current organization
- Applies theme to CSS custom properties
- Provides theme data to all components

### 2. Theme Provider (in `src/app/layout.tsx`)
- Wraps the entire application
- Automatically fetches and applies organization themes
- Updates theme when organization changes

### 3. CSS Variables (in `src/app/globals.css`)
- Defines theme variables for both light and dark modes
- Provides utility classes for easy theme usage

## How to Use Themes in Components

### Method 1: Using the useTheme Hook (Recommended)

```tsx
import { useTheme } from '@/context/ThemeContext';

function MyComponent() {
  const { theme } = useTheme();
  
  return (
    <div>
      <button 
        style={{ 
          backgroundColor: theme.primary_color,
          color: '#ffffff' 
        }}
      >
        Primary Button
      </button>
      <label style={{ color: theme.text_color }}>
        Custom Label
      </label>
    </div>
  );
}
```

### Method 2: Using CSS Utility Classes

```tsx
function MyComponent() {
  return (
    <div>
      <button className="theme-primary-bg text-white">
        Primary Button
      </button>
      <label className="theme-text">
        Custom Label
      </label>
      <div className="theme-border border">
        Bordered Container
      </div>
    </div>
  );
}
```

### Method 3: Using the ThemeButton Component

```tsx
import { ThemeButton } from '@/components/ui/theme-button';

function MyComponent() {
  return (
    <div>
      <ThemeButton variant="primary">
        Primary Button
      </ThemeButton>
      <ThemeButton variant="secondary">
        Secondary Button
      </ThemeButton>
      <ThemeButton variant="accent">
        Accent Button
      </ThemeButton>
      <ThemeButton variant="outline">
        Outline Button
      </ThemeButton>
    </div>
  );
}
```

## Available CSS Utility Classes

- `.theme-primary` - Primary color text
- `.theme-primary-bg` - Primary color background
- `.theme-secondary` - Secondary color text
- `.theme-secondary-bg` - Secondary color background
- `.theme-accent` - Accent color text
- `.theme-accent-bg` - Accent color background
- `.theme-text` - Text color
- `.theme-border` - Secondary color border

## CSS Custom Properties

The theme system automatically sets these CSS variables:

```css
:root {
  --theme-primary: #800020;
  --theme-secondary: #D4AF37;
  --theme-accent: #FFD700;
  --theme-text: #1f2937;
}
```

You can use these in your CSS:

```css
.my-custom-button {
  background-color: var(--theme-primary);
  color: white;
}

.my-custom-label {
  color: var(--theme-text);
}
```

## Theme Management

### Settings Page
- Go to Organization Settings → Theme tab
- Use color pickers or enter hex values
- Preview changes in real-time
- Save to apply across the entire application

### Database Schema
Themes are stored in the `organization_themes` table:
```sql
CREATE TABLE organization_themes (
  organization_id UUID PRIMARY KEY REFERENCES organizations(id),
  primary_color TEXT NOT NULL DEFAULT '#800020',
  secondary_color TEXT NOT NULL DEFAULT '#D4AF37',
  accent_color TEXT NOT NULL DEFAULT '#FFD700',
  text_color TEXT NOT NULL DEFAULT '#1f2937',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Best Practices

1. **Use the useTheme hook** for dynamic theme values
2. **Use utility classes** for static theme elements
3. **Test in both light and dark modes**
4. **Ensure sufficient contrast** between text and background colors
5. **Use semantic color names** (primary, secondary, accent) rather than specific colors

## Example Implementation

Here's a complete example of a themed component:

```tsx
import { useTheme } from '@/context/ThemeContext';
import { ThemeButton } from '@/components/ui/theme-button';

function ThemedCard({ title, content }: { title: string; content: string }) {
  const { theme } = useTheme();
  
  return (
    <div 
      className="p-4 rounded-lg border"
      style={{ 
        borderColor: theme.secondary_color,
        backgroundColor: '#ffffff'
      }}
    >
      <h3 
        className="text-lg font-semibold mb-2"
        style={{ color: theme.text_color }}
      >
        {title}
      </h3>
      <p 
        className="mb-4"
        style={{ color: theme.text_color }}
      >
        {content}
      </p>
      <div className="flex gap-2">
        <ThemeButton variant="primary">
          Primary Action
        </ThemeButton>
        <ThemeButton variant="outline">
          Secondary Action
        </ThemeButton>
      </div>
    </div>
  );
}
```

## Troubleshooting

### Theme not updating
1. Check if the organization is selected
2. Verify the theme is saved in the database
3. Refresh the page to reload the theme context
4. Check browser console for errors

### Colors not applying
1. Ensure the component is wrapped in ThemeProvider
2. Check if CSS variables are being set correctly
3. Verify the useTheme hook is being used properly
4. Check for CSS specificity conflicts

### Performance considerations
1. Theme context updates trigger re-renders
2. Use React.memo for components that don't need theme updates
3. Consider using CSS variables for static theme elements
4. Avoid inline styles for frequently changing elements 