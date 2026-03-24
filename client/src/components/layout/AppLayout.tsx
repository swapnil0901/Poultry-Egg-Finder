import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";
import { Egg } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const { t } = useI18n();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
        {/* Animated background gradients */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-3xl"
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            className="absolute top-1/4 right-0 w-80 h-80 bg-gradient-to-bl from-accent/20 to-transparent rounded-full blur-3xl"
          />
        </div>
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full"
        />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans relative overflow-hidden">
      {/* Animated background elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        {/* Large gradient orbs */}
        <motion.div
          animate={{ 
            y: [0, -30, 0],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-20 -left-40 w-80 h-80 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-3xl"
        />
        <motion.div
          animate={{ 
            y: [0, 30, 0],
            opacity: [0.2, 0.4, 0.2]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -bottom-40 right-0 w-96 h-96 bg-gradient-to-tl from-accent/15 to-transparent rounded-full blur-3xl"
        />
        <motion.div
          animate={{ 
            x: [0, 20, 0],
            opacity: [0.15, 0.3, 0.15]
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/2 right-1/4 w-72 h-72 bg-gradient-to-bl from-primary/10 to-transparent rounded-full blur-3xl"
        />
      </div>

      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Mobile Header */}
        <motion.header 
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          className="lg:hidden bg-gradient-to-r from-primary to-primary/80 text-white p-4 flex items-center justify-between shadow-lg shadow-primary/20 z-30 sticky top-0 border-b border-white/10"
        >
          <div className="flex items-center gap-3">
            <motion.div
              whileHover={{ scale: 1.1, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
            >
              <Egg className="text-accent drop-shadow-lg" size={28} />
            </motion.div>
            <span className="font-bold font-display text-xl drop-shadow-sm">PoultryCare</span>
          </div>
          <div className="flex gap-2">
            <Link href="/" className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors backdrop-blur-sm">
              <Egg size={20} />
            </Link>
          </div>
        </motion.header>
        
        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar relative">
          {/* Decorative background blur elements */}
          <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-primary/8 via-transparent to-transparent -z-10 pointer-events-none" />
          <div className="absolute top-1/4 right-0 w-96 h-96 bg-gradient-to-l from-accent/5 to-transparent -z-10 pointer-events-none rounded-full blur-3xl" />
          
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export function PageHeader({ title, description, action }: { title: string, description: string, action?: ReactNode }) {
  const { t } = useI18n();
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 relative group"
    >
      {/* Gradient background on hover */}
      <div className="absolute -inset-6 bg-gradient-to-r from-primary/5 to-accent/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10" />
      
      <div className="relative">
        <motion.h1 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="text-3xl md:text-4xl font-bold font-display text-gradient tracking-tight drop-shadow-sm"
        >
          {t(title)}
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-muted-foreground mt-2 text-lg"
        >
          {t(description)}
        </motion.p>
      </div>
      {action && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          {action}
        </motion.div>
      )}
    </motion.div>
  );
}
