import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import PageTransition from "./components/PageTransition";
import Index from "./pages/Index";
import TeacherLogin from "./pages/TeacherLogin";
import TeacherDashboard from "./pages/TeacherDashboard";
import CreateAssignment from "./pages/CreateAssignment";
import StudentAssignment from "./pages/StudentAssignment";
import ViewResponses from "./pages/ViewResponses";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AnimatedRoutes = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><Index /></PageTransition>} />
        <Route path="/teacher/login" element={<PageTransition><TeacherLogin /></PageTransition>} />
        <Route path="/teacher/dashboard" element={<PageTransition><TeacherDashboard /></PageTransition>} />
        <Route path="/teacher/create" element={<PageTransition><CreateAssignment /></PageTransition>} />
        <Route path="/teacher/assignment/:id" element={<PageTransition><ViewResponses /></PageTransition>} />
        <Route path="/assignment/:id" element={<PageTransition><StudentAssignment /></PageTransition>} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AnimatedRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
