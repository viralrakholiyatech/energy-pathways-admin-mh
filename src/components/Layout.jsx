import Sidebar from "./Sidebar";
import Header from "./Header";
import Footer from "./Footer";
import { useSidebar } from "../context/sidebarContext";

const Layout = ({ children }) => {
  const { collapsed, closeSidebar } = useSidebar();

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans antialiased text-gray-800">
      <Sidebar />
      {!collapsed && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={closeSidebar}
        />
      )}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${
          collapsed ? "lg:ml-[76px]" : "lg:ml-[260px]"
        }`}
      >
        <Header />
        <main className="flex-1 p-5 lg:p-8 max-w-[1600px] w-full mx-auto">
          {children}
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default Layout;
