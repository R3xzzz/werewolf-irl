import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cn } from "../../lib/utils"
// Note: We'll install class-variance-authority later if we need complex variants, 
// but for now, simple tailwind conditional logic is fine to save time.

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'glass';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'default', asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    
    // Base styles
    let classes = "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moon-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-95";
    
    // Variant styles
    if (variant === 'primary') classes += " bg-moon-800 text-white hover:bg-moon-900 shadow-[0_0_15px_rgba(167,139,250,0.3)] hover:shadow-[0_0_25px_rgba(167,139,250,0.5)]";
    if (variant === 'secondary') classes += " bg-forest-900 text-moon-200 hover:bg-forest-800 border border-moon-800/50";
    if (variant === 'danger') classes += " bg-wolf-800 text-white hover:bg-wolf-900 shadow-[0_0_15px_rgba(239,68,68,0.3)]";
    if (variant === 'ghost') classes += " hover:bg-forest-900 hover:text-moon-200";
    if (variant === 'glass') classes += " glass-panel hover:glass-panel-active text-white";

    // Size styles
    if (size === 'default') classes += " h-10 px-4 py-2";
    if (size === 'sm') classes += " h-9 rounded-md px-3";
    if (size === 'lg') classes += " h-12 rounded-md px-8 text-lg font-serif tracking-wider";
    if (size === 'icon') classes += " h-10 w-10";

    return (
      <Comp
        className={cn(classes, className)}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
