import { ReactNode, useEffect, useState } from "react";
import { SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Button } from "@/components/ui/button";
import { Coins, ShoppingCart, X } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useTokens } from "@/contexts/TokenContext";
import { TokenPurchaseModal } from "./TokenPurchaseModal";
import { NotificationDropdown } from "./NotificationDropdown";
import AnnouncementBanner from "./AnnouncementBanner";

interface DashboardLayoutProps {
  children: ReactNode;
}

function DashboardContent({ children }: DashboardLayoutProps) {
  const { setOpen } = useSidebar();
  const location = useLocation();
  const { balance } = useTokens();
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showTokenAlert, setShowTokenAlert] = useState(false);

  // Show token alert only once per session (when user logs in)
  useEffect(() => {
    const hasSeenTokenAlert = localStorage.getItem('hasSeenTokenAlert');
    if (!hasSeenTokenAlert && balance !== null && balance > 0) {
      setShowTokenAlert(true);
      localStorage.setItem('hasSeenTokenAlert', 'true');
    }
  }, [balance]);

  // Auto-collapse sidebar on design page (optional - can be removed if not needed)
  // useEffect(() => {
  //   if (location.pathname === '/design') {
  //     setOpen(false);
  //   } else {
  //     setOpen(true);
  //   }
  // }, [location.pathname, setOpen]);

  return (
    <div className="min-h-screen flex w-full bg-background">
      <AppSidebar />
      
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-16 sm:h-20 border-b border-border/50 glass-effect flex items-center justify-between px-3 sm:px-6 shadow-elegant">
          <div className="flex items-center gap-2 sm:gap-6 min-w-0 flex-1">
            <SidebarTrigger className="hover:bg-primary/10 hover:text-primary transition-all duration-300 p-1 sm:p-2 rounded-lg data-[state=open]:bg-primary/10 flex-shrink-0" />
            <div className="animate-slide-up min-w-0 flex-1">
              <h1 className="font-bold text-sm sm:text-xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent truncate">
                Barcode Generator Pro
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground font-medium hidden sm:block truncate">
                Professional barcode generation platform
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-1 sm:gap-3 flex-shrink-0">
            {/* Token Balance - Hidden on very small screens */}
            <div className="hidden xs:flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-2 bg-muted/30 rounded-lg">
              <Coins className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-600" />
              <span className="text-xs sm:text-sm font-medium">{balance}</span>
              <span className="text-xs text-muted-foreground hidden sm:inline">tokens</span>
            </div>
            
            {/* Buy Tokens Button */}
            <Button 
              onClick={() => setShowPurchaseModal(true)}
              size="sm" 
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs sm:text-sm px-2 sm:px-3"
            >
              <ShoppingCart className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
              <span className="hidden sm:inline">Buy Tokens</span>
              <span className="sm:hidden">Buy</span>
            </Button>
            
            <NotificationDropdown />
          </div>
        </header>

        {/* Token Balance Alert Banner */}
        {showTokenAlert && balance !== null && balance > 0 && (
          <div className="bg-green-50 border-b border-green-200 px-3 sm:px-6 py-2 sm:py-3">
            <div className="flex items-start sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Coins className="w-3 h-3 sm:w-4 sm:h-4 text-green-600 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium text-green-800 leading-tight">
                  You have <span className="font-bold">{balance.toLocaleString()}</span> tokens available for barcode generation.
                </span>
              </div>
              <button
                onClick={() => {
                  setShowTokenAlert(false);
                  localStorage.setItem('hasSeenTokenAlert', 'true');
                }}
                className="text-green-600 hover:text-green-800 transition-colors flex-shrink-0 p-1"
              >
                <X className="w-3 h-3 sm:w-4 sm:h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 p-3 sm:p-6 overflow-auto">
          {/* Announcement Banner */}
          <div className="mb-3 sm:mb-4">
            <AnnouncementBanner />
          </div>
          {children}
        </main>
      </div>
      
      {/* Token Purchase Modal */}
      <TokenPurchaseModal
        open={showPurchaseModal}
        onClose={() => setShowPurchaseModal(false)}
      />
    </div>
  );
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <SidebarProvider defaultOpen={true} className="sidebar-provider">
      <DashboardContent>{children}</DashboardContent>
    </SidebarProvider>
  );
}