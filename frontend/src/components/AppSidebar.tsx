import { BarChart3, Upload, FileSpreadsheet, Download, Settings, Home, TestTube, Smartphone, CreditCard, LogOut, User, DollarSign, TrendingUp, Library } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useMenuSettings } from "@/contexts/MenuContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
  SidebarHeader,
} from "@/components/ui/sidebar"

const navigationItems = [
  { title: "Dashboard", url: "/", icon: Home, key: "dashboard" as const },
  { title: "Features", url: "/features", icon: Library, key: "features" as const },
  { title: "API Test", url: "/api-test", icon: TestTube, key: "apiTest" as const },
  { title: "Upload Excel", url: "/upload-excel", icon: Upload, key: "uploadExcel" as const },
  { title: "Data Preview", url: "/data-preview", icon: FileSpreadsheet, key: "dataPreview" as const },
  { title: "Generate Barcodes", url: "/generate", icon: BarChart3, key: "generateBarcodes" as const },
  { title: "Design", url: "/design", icon: Smartphone, key: "design" as const },
  { title: "Subscription", url: "/subscription", icon: CreditCard, key: "subscription" as const },
  { title: "Payments Dashboard", url: "/payments", icon: TrendingUp, key: "payments" as const },
  { title: "Collections", url: "/collections", icon: DollarSign, key: "collections" as const },
  { title: "Downloads", url: "/downloads", icon: Download, key: "downloads" as const },
  { title: "Settings", url: "/settings", icon: Settings, key: "settings" as const },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const { menuSettings } = useMenuSettings();
  const { user, logout } = useAuth();

  const isActive = (path: string) => currentPath === path;
  const isCollapsed = state === "collapsed";

  const getNavClass = ({ isActive }: { isActive: boolean }) =>
    isActive 
      ? "sidebar-menu-active" 
      : "sidebar-menu-inactive";

  // Filter navigation items based on menu settings and user permissions
  const visibleNavigationItems = navigationItems.filter(item => {
    // Check menu settings first
    if (!menuSettings[item.key]) return false;
    
    // Check super admin permissions for subscription, payments and collections
    if (item.key === 'subscription' || item.key === 'payments' || item.key === 'collections') {
      return user?.is_super_admin;
    }
    
    return true;
  });

  return (
    <Sidebar
      className="border-r border-border bg-slate-900"
      collapsible="icon"
    >
      {/* BarcodeGen Style Header */}
      <SidebarHeader className="p-6">
        {!isCollapsed && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-primary-foreground" />
            </div>
            <h2 className="font-semibold text-lg text-black">BarcodeGen</h2>
          </div>
        )}
        {isCollapsed && (
          <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center mx-auto">
            <BarChart3 className="w-5 h-5 text-primary-foreground" />
          </div>
        )}
      </SidebarHeader>

      {/* Navigation Content */}
      <SidebarContent className="px-4 pb-4">
        <SidebarMenu className="space-y-2">
          {visibleNavigationItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild className="sidebar-menu-button">
                <NavLink 
                  to={item.url} 
                  end 
                  className={getNavClass}
                >
                  <div className="flex items-center gap-3 w-full">
                    <item.icon className="sidebar-menu-icon flex-shrink-0" />
                    {!isCollapsed && (
                      <span className="sidebar-menu-text flex-1">{item.title}</span>
                    )}
                  </div>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>

        {/* User Info & Logout */}
        <div className="mt-auto pt-8">
          {!isCollapsed && (
            <div className="p-3 bg-muted/30 rounded-lg space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-primary-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-foreground">
                    {user?.username || 'User'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user?.email}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={logout}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          )}
          {isCollapsed && (
            <Button
              variant="ghost"
              size="icon"
              className="w-full"
              onClick={logout}
            >
              <LogOut className="w-4 h-4" />
            </Button>
          )}
        </div>
      </SidebarContent>
    </Sidebar>
  );
}