import { useEffect } from "react";
import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

// Pages
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import ClassicDashboard from "./pages/ClassicDashboard";
import EggCollection from "./pages/EggCollection";
import EggSales from "./pages/EggSales";
import ChickenSales from "./pages/ChickenSales";
import ChickenManagement from "./pages/ChickenManagement";
import Inventory from "./pages/Inventory";
import FeedManagement from "./pages/FeedManagement";
import Expenses from "./pages/Expenses";
import Vaccinations from "./pages/Vaccinations";
import Reports from "./pages/Reports";
import AIAssistant from "./pages/AIAssistant";
import NotFound from "@/pages/not-found";

import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { initializeNotifications } from "@/notification";
import FloatingMicButton from "@/components/assistant/FloatingMicButton";
import { LanguageProvider } from "@/lib/i18n";

// Route guard component
function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) return null;
  if (!user) return <Redirect to="/auth" />;
  
  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={Auth} />
      
      {/* Protected Routes */}
      <Route path="/">
        {() => <ProtectedRoute component={Dashboard} />}
      </Route>
      <Route path="/classic-dashboard">
        {() => <ProtectedRoute component={ClassicDashboard} />}
      </Route>
      <Route path="/eggs">
        {() => <ProtectedRoute component={EggCollection} />}
      </Route>
      <Route path="/sales">
        {() => <ProtectedRoute component={EggSales} />}
      </Route>
      <Route path="/chicken-sales">
        {() => <ProtectedRoute component={ChickenSales} />}
      </Route>
      <Route path="/chickens">
        {() => <ProtectedRoute component={ChickenManagement} />}
      </Route>
      <Route path="/inventory">
        {() => <ProtectedRoute component={Inventory} />}
      </Route>
      <Route path="/feed">
        {() => <ProtectedRoute component={FeedManagement} />}
      </Route>
      <Route path="/expenses">
        {() => <ProtectedRoute component={Expenses} />}
      </Route>
      <Route path="/vaccinations">
        {() => <ProtectedRoute component={Vaccinations} />}
      </Route>
      <Route path="/reports">
        {() => <ProtectedRoute component={Reports} />}
      </Route>
      <Route path="/ai">
        {() => <ProtectedRoute component={AIAssistant} />}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const { toast } = useToast();

  useEffect(() => {
    void initializeNotifications((payload) => {
      toast({
        title: payload.title,
        description: payload.body,
      });

      if (Notification.permission === "granted") {
        const notification = new Notification(payload.title, {
          body: payload.body,
          icon: payload.icon,
        });
        notification.onclick = () => {
          window.location.href = payload.url;
          notification.close();
        };
      }
    });
  }, [toast]);

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <FloatingMicButton />
          <Router />
        </TooltipProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;
