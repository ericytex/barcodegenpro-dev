import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface MenuSettings {
  dashboard: boolean;
  apiTest: boolean;
  uploadExcel: boolean;
  dataPreview: boolean;
  generateBarcodes: boolean;
  design: boolean;
  subscription: boolean;
  payments: boolean;
  downloads: boolean;
  settings: boolean;
  collections: boolean;
  features: boolean;
  howTo: boolean;
}

interface MenuContextType {
  menuSettings: MenuSettings;
  updateMenuSetting: (key: keyof MenuSettings, value: boolean) => void;
  resetMenuSettings: () => void;
}

const defaultMenuSettings: MenuSettings = {
  dashboard: true,
  apiTest: true,
  uploadExcel: true,
  dataPreview: true,
  generateBarcodes: true,
  design: true,
  subscription: true,
  payments: true,
  downloads: true,
  settings: true,
  collections: true,
  features: true,
  howTo: true,
};

const MenuContext = createContext<MenuContextType | undefined>(undefined);

export function MenuProvider({ children }: { children: ReactNode }) {
  const [menuSettings, setMenuSettings] = useState<MenuSettings>(() => {
    // Load from localStorage or use defaults
    const saved = localStorage.getItem('menuSettings');
    return saved ? { ...defaultMenuSettings, ...JSON.parse(saved) } : defaultMenuSettings;
  });

  const updateMenuSetting = (key: keyof MenuSettings, value: boolean) => {
    const newSettings = { ...menuSettings, [key]: value };
    setMenuSettings(newSettings);
    localStorage.setItem('menuSettings', JSON.stringify(newSettings));
  };

  const resetMenuSettings = () => {
    setMenuSettings(defaultMenuSettings);
    localStorage.setItem('menuSettings', JSON.stringify(defaultMenuSettings));
  };

  return (
    <MenuContext.Provider value={{ menuSettings, updateMenuSetting, resetMenuSettings }}>
      {children}
    </MenuContext.Provider>
  );
}

export function useMenuSettings() {
  const context = useContext(MenuContext);
  if (context === undefined) {
    throw new Error('useMenuSettings must be used within a MenuProvider');
  }
  return context;
}
