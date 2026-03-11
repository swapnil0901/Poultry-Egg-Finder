import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, Egg, IndianRupee, ShieldAlert, 
  Package, Receipt, Syringe, FileBarChart, Bot, LogOut, Bird, Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { motion } from "framer-motion";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/eggs", label: "Egg Collection", icon: Egg },
  { href: "/sales", label: "Egg Sales", icon: IndianRupee },
  { href: "/chicken-sales", label: "Chicken Sales", icon: IndianRupee },
  { href: "/chickens", label: "Chickens", icon: Bird },
  { href: "/diseases", label: "Health & Disease", icon: ShieldAlert },
  { href: "/inventory", label: "Inventory", icon: Package },
  { href: "/feed", label: "Feed Logs", icon: Package },
  { href: "/expenses", label: "Expenses", icon: Receipt },
  { href: "/vaccinations", label: "Vaccinations", icon: Syringe },
  { href: "/reports", label: "Reports", icon: FileBarChart },
  { href: "/ai", label: "AI Assistant", icon: Bot },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.3 },
  },
};

export function Sidebar() {
  const [location] = useLocation();
  const { logout, user } = useAuth();

  return (
    <aside className="w-72 hidden lg:flex flex-col bg-gradient-to-b from-primary to-primary/95 text-primary-foreground h-screen sticky top-0 shadow-2xl z-40 overflow-hidden relative">
      {/* Decorative background elements */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-0 right-0 w-40 h-40 bg-accent/20 rounded-full blur-2xl" />
        <div className="absolute bottom-20 left-0 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
      </div>

      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="p-8 flex items-center gap-3 border-b border-white/10 relative z-10 group hover:border-white/20 transition-colors"
      >
        <motion.div
          whileHover={{ scale: 1.1, rotate: 5 }}
          className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center shadow-lg shadow-accent/50"
        >
          <Egg className="text-accent-foreground w-6 h-6" />
        </motion.div>
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight leading-none text-white drop-shadow-sm">PoultryCare</h1>
          <p className="text-xs text-primary-foreground/70 font-medium tracking-wide uppercase mt-1">Farm Management</p>
        </div>
      </motion.div>
      
      {/* Navigation Items */}
      <motion.div 
        className="flex-1 overflow-y-auto py-6 px-4 flex flex-col gap-1.5 custom-scrollbar relative z-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {navItems.map((item, idx) => {
          const isActive = location === item.href;
          return (
            <motion.div key={item.href} variants={itemVariants}>
              <Link href={item.href} className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium group relative overflow-hidden",
                isActive 
                  ? "bg-white text-primary shadow-lg shadow-black/20 scale-[1.02]" 
                  : "text-primary-foreground/80 hover:bg-white/15 hover:text-white hover:shadow-lg hover:shadow-white/10"
              )}>
                {/* Animated background for active state */}
                {isActive && (
                  <motion.div
                    layoutId="navHighlight"
                    className="absolute inset-0 bg-white rounded-xl -z-10"
                    transition={{ duration: 0.3 }}
                  />
                )}
                
                <motion.div
                  whileHover={{ scale: 1.2, rotate: 10 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <item.icon size={20} className="transition-transform duration-200" />
                </motion.div>
                
                <span className="relative z-10">{item.label}</span>

                {/* Sparkle effect for active item */}
                {isActive && (
                  <motion.div
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="ml-auto"
                  >
                    <Sparkles size={16} className="text-primary" />
                  </motion.div>
                )}
              </Link>
            </motion.div>
          );
        })}
      </motion.div>

      {/* User Profile Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
        className="p-4 border-t border-white/10 bg-black/20 backdrop-blur-sm relative z-10"
      >
        <motion.div 
          className="flex items-center gap-3 px-4 py-3 mb-2 rounded-xl hover:bg-white/10 transition-colors"
          whileHover={{ scale: 1.02 }}
        >
          <motion.div 
            className="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-accent/60 flex items-center justify-center font-bold text-lg text-accent-foreground shadow-lg shadow-accent/30"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </motion.div>
          <div className="flex-1 overflow-hidden">
            <p className="font-semibold truncate">{user?.name}</p>
            <p className="text-xs opacity-70 truncate capitalize">{user?.role}</p>
          </div>
        </motion.div>

        <motion.button 
          onClick={logout}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.95 }}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-destructive/90 to-destructive text-white hover:from-destructive hover:to-destructive/90 transition-all duration-200 font-medium shadow-lg shadow-destructive/20 hover:shadow-lg hover:shadow-destructive/30"
        >
          <LogOut size={18} />
          Sign Out
        </motion.button>
      </motion.div>
    </aside>
  );
}
