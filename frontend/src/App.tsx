import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MenuProvider } from "@/contexts/MenuContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { TokenProvider } from "@/contexts/TokenContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import TestPage from "./pages/TestPage";
import UploadPage from "./pages/UploadPage";
import PreviewPage from "./pages/PreviewPage";
import GeneratePage from "./pages/GeneratePage";
import DownloadsPage from "./pages/DownloadsPage";
import { SettingsPageNew } from "./pages/SettingsPage";
import SamsungGalaxyPage from "./pages/SamsungGalaxyPage";
import SubscriptionPage from "./pages/SubscriptionPage";
import PaymentsDashboard from "./pages/PaymentsDashboard";
import CollectionsDashboard from "./pages/CollectionsDashboard";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import FeaturesPage from "./pages/FeaturesPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <AuthProvider>
          <TokenProvider>
            <NotificationProvider>
              <MenuProvider>
              <Toaster />
              <Sonner />
              <Routes>
                {/* Public routes */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                
                {/* Protected routes */}
                <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                <Route path="/test" element={<ProtectedRoute><TestPage /></ProtectedRoute>} />
                <Route path="/upload" element={<ProtectedRoute><UploadPage /></ProtectedRoute>} />
                <Route path="/preview" element={<ProtectedRoute><PreviewPage /></ProtectedRoute>} />
                <Route path="/generate" element={<ProtectedRoute><GeneratePage /></ProtectedRoute>} />
                <Route path="/downloads" element={<ProtectedRoute><DownloadsPage /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><SettingsPageNew /></ProtectedRoute>} />
                <Route path="/design" element={<ProtectedRoute><SamsungGalaxyPage /></ProtectedRoute>} />
                <Route path="/subscription" element={<ProtectedRoute><SubscriptionPage /></ProtectedRoute>} />
                <Route path="/payments" element={<ProtectedRoute><PaymentsDashboard /></ProtectedRoute>} />
                <Route path="/collections" element={<ProtectedRoute><CollectionsDashboard /></ProtectedRoute>} />
                <Route path="/features" element={<ProtectedRoute><FeaturesPage /></ProtectedRoute>} />
                
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
              </MenuProvider>
            </NotificationProvider>
          </TokenProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
