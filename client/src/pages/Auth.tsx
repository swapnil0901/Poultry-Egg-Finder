import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Input, Button, Card } from "@/components/ui-kit";
import { Egg, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

export default function Auth() {
  const nameRegex = /^[A-Za-z\s]+$/;
  const [isLogin, setIsLogin] = useState(true);
  const { login, register, isLoggingIn, isRegistering } = useAuth();
  const [nameError, setNameError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "worker",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isLogin) {
      const trimmedName = formData.name.trim();

      if (!nameRegex.test(trimmedName)) {
        setNameError("Name must contain only letters.");
        return;
      }

      setNameError("");
    }

    try {
      if (isLogin) {
        await login({ email: formData.email, password: formData.password });
      } else {
        await register({ ...formData, name: formData.name.trim() } as any);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleNameChange = (value: string) => {
    setFormData({ ...formData, name: value });

    if (!value.trim() || nameRegex.test(value)) {
      setNameError("");
      return;
    }

    setNameError("Name must contain only letters.");
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" },
    },
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4 relative overflow-hidden">
      <motion.div
        animate={{ y: [0, -20, 0], x: [0, 10, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-gradient-to-br from-primary/30 to-primary/10 rounded-full blur-3xl"
      />
      <motion.div
        animate={{ y: [0, 20, 0], x: [0, -15, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-gradient-to-tl from-accent/25 to-accent/5 rounded-full blur-3xl"
      />
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute top-1/3 right-1/4 w-72 h-72 bg-gradient-to-l from-primary/10 to-transparent rounded-full blur-3xl"
      />

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md relative z-10"
      >
        <motion.div
          className="text-center mb-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div
            variants={itemVariants}
            whileHover={{ scale: 1.1, rotate: 5 }}
            className="inline-flex w-16 h-16 bg-gradient-to-br from-primary to-primary/80 rounded-2xl items-center justify-center shadow-xl shadow-primary/30 mb-4"
          >
            <motion.div
              animate={{ rotate: [0, -5, 5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Egg className="text-white w-8 h-8" />
            </motion.div>
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="text-4xl font-bold font-display text-gradient tracking-tight"
          >
            PoultryCare
          </motion.h1>
          <motion.p
            variants={itemVariants}
            className="text-muted-foreground mt-2 text-lg"
          >
            Smart farm management system
          </motion.p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="p-8 shadow-2xl shadow-black/10">
            <motion.h2
              key={isLogin ? "login" : "signup"}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="text-2xl font-bold mb-6 font-display text-center text-primary"
            >
              {isLogin ? "Welcome Back" : "Create Account"}
            </motion.h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                {!isLogin && (
                  <motion.div variants={itemVariants}>
                    <Input
                      label="Full Name"
                      placeholder="John Doe"
                      value={formData.name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      pattern="^[A-Za-z\\s]+$"
                      title="Name must contain only letters."
                      error={nameError}
                      required
                    />
                  </motion.div>
                )}
                <motion.div variants={itemVariants}>
                  <Input
                    label="Email Address"
                    type="email"
                    placeholder="you@farm.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </motion.div>
                <motion.div variants={itemVariants}>
                  <Input
                    label="Password"
                    type="password"
                    placeholder="********"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                </motion.div>
                {!isLogin && (
                  <motion.div variants={itemVariants} className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-foreground/70 ml-2">Role</label>
                    <select
                      className="w-full px-4 py-3 rounded-xl bg-white/60 backdrop-blur-sm border-2 border-border/40 text-foreground focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/15 transition-all duration-200 focus:shadow-lg focus:shadow-primary/10 focus:bg-white/80 cursor-pointer appearance-none"
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    >
                      <option value="worker">Worker</option>
                      <option value="admin">Admin</option>
                    </select>
                  </motion.div>
                )}
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <Button
                  type="submit"
                  className="w-full mt-6"
                  size="lg"
                  variant="gradient"
                  disabled={isLoggingIn || isRegistering}
                >
                  {isLoggingIn || isRegistering ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity }}
                      className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                    />
                  ) : (
                    <>
                      {isLogin ? "Sign In" : "Sign Up"}
                      <ChevronRight size={18} />
                    </>
                  )}
                </Button>
              </motion.div>
            </form>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-6 text-center text-sm font-medium"
            >
              <span className="text-muted-foreground">
                {isLogin ? "Don't have an account? " : "Already have an account? "}
              </span>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setIsLogin(!isLogin);
                  setNameError("");
                  setFormData({ name: "", email: "", password: "", role: "worker" });
                }}
                className="text-primary hover:text-primary/80 font-semibold transition-colors inline-flex items-center gap-1"
              >
                {isLogin ? "Sign up" : "Sign in"}
                <ChevronRight size={16} className="transition-transform group-hover:translate-x-1" />
              </motion.button>
            </motion.div>
          </Card>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="text-center text-muted-foreground text-xs mt-6"
        >
          Secure farm management powered by advanced technology
        </motion.p>
      </motion.div>
    </div>
  );
}
