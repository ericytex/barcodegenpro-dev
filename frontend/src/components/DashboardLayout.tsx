import { ReactNode, useEffect, useState } from "react";
import { SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Button } from "@/components/ui/button";
import { Coins, ShoppingCart } from "lucide-react";
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
        <header className="h-20 border-b border-border/50 glass-effect flex items-center justify-between px-6 shadow-elegant">
          <div className="flex items-center gap-6">
            <SidebarTrigger className="hover:bg-primary/10 hover:text-primary transition-all duration-300 p-2 rounded-lg data-[state=open]:bg-primary/10" />
            <div className="animate-slide-up">
              <h1 className="font-bold text-xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Barcode Generator Pro
              </h1>
              <p className="text-sm text-muted-foreground font-medium">
                Professional barcode generation platform
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Token Balance */}
            <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 rounded-lg">
              <Coins className="w-4 h-4 text-yellow-600" />
              <span className="text-sm font-medium">{balance}</span>
              <span className="text-xs text-muted-foreground">tokens</span>
            </div>
            
            {/* Buy Tokens Button */}
            <Button 
              onClick={() => setShowPurchaseModal(true)}
              size="sm" 
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Buy Tokens
            </Button>
            
            <NotificationDropdown />
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-auto">
          {/* Announcement Banner */}
          <div className="mb-4">
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