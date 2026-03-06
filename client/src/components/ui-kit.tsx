import React from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export const Card = ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("glass-card rounded-2xl p-6 relative overflow-hidden group", className)} {...props}>
    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/5 to-transparent rounded-bl-full -z-10 transition-transform duration-500 group-hover:scale-150" />
    {children}
  </div>
);

export const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'outline' | 'ghost', size?: 'sm' | 'md' | 'lg' }>(
  ({ className, variant = 'primary', size = 'md', children, disabled, ...props }, ref) => {
    const variants = {
      primary: "bg-primary text-white shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 border border-transparent",
      secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-transparent",
      outline: "bg-transparent border-2 border-primary/20 text-primary hover:border-primary hover:bg-primary/5",
      ghost: "bg-transparent text-foreground hover:bg-black/5 border border-transparent",
    };
    const sizes = {
      sm: "px-4 py-2 text-sm",
      md: "px-6 py-3 text-base",
      lg: "px-8 py-4 text-lg font-bold",
    };

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          "rounded-xl font-semibold transition-all duration-200 ease-out active:translate-y-0 active:shadow-md flex items-center justify-center gap-2",
          variants[variant],
          sizes[size],
          disabled && "opacity-50 cursor-not-allowed transform-none shadow-none",
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { label?: string, error?: string }>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && <label className="text-sm font-semibold text-foreground/80 ml-1">{label}</label>}
        <input
          ref={ref}
          className={cn(
            "w-full px-4 py-3 rounded-xl bg-white/50 backdrop-blur-sm border-2 border-border/50 text-foreground placeholder:text-muted-foreground/50",
            "focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all duration-200",
            error && "border-destructive focus:border-destructive focus:ring-destructive/10",
            className
          )}
          {...props}
        />
        {error && <span className="text-xs font-medium text-destructive ml-1">{error}</span>}
      </div>
    );
  }
);
Input.displayName = "Input";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string, error?: string }>(
  ({ className, label, error, children, ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && <label className="text-sm font-semibold text-foreground/80 ml-1">{label}</label>}
        <select
          ref={ref}
          className={cn(
            "w-full px-4 py-3 rounded-xl bg-white/50 backdrop-blur-sm border-2 border-border/50 text-foreground appearance-none",
            "focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all duration-200 cursor-pointer",
            error && "border-destructive focus:border-destructive",
            className
          )}
          {...props}
        >
          {children}
        </select>
      </div>
    );
  }
);
Select.displayName = "Select";

export const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-white/20">
              <div className="px-6 py-4 border-b border-border/50 flex items-center justify-between bg-background/50">
                <h2 className="text-xl font-bold font-display text-primary">{title}</h2>
                <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full transition-colors text-foreground/50 hover:text-foreground">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 max-h-[70vh] overflow-y-auto">
                {children}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export const DataTable = ({ headers, children }: { headers: string[], children: React.ReactNode }) => (
  <div className="w-full overflow-x-auto rounded-2xl border border-border/50 bg-white/50 backdrop-blur-sm shadow-lg shadow-black/5">
    <table className="w-full text-left border-collapse min-w-[600px]">
      <thead>
        <tr className="bg-background/80 border-b border-border/50">
          {headers.map((h, i) => (
            <th key={i} className="px-6 py-4 font-semibold text-sm text-foreground/70 uppercase tracking-wider">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-border/30">
        {children}
      </tbody>
    </table>
  </div>
);
