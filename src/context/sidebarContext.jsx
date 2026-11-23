import { createContext, useContext, useState } from "react";
const SidebarContext = createContext(null);
export const SidebarProvider = ({ children }) => {
  const [collapsed, setCollapsed] = useState(window.innerWidth < 1024);
  const toggleSidebar = () => setCollapsed((prev) => !prev);
  const closeSidebar = () => setCollapsed(true);
  return (
    <SidebarContext.Provider value={{ collapsed, toggleSidebar, closeSidebar }}>
      {children}
    </SidebarContext.Provider>
  );
};
export const useSidebar = () => useContext(SidebarContext);
