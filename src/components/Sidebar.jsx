import { NavLink, useLocation } from "react-router-dom";
import { FiUploadCloud, FiPlus } from "react-icons/fi";
import { useSidebar } from "../context/sidebarContext";
import Logo from "./Logo";

const navItems = [
  { name: "Data Upload", path: "/admin/data-upload", icon: FiUploadCloud },
  { name: "Data Update", path: "/admin/data-update", icon: FiPlus }
];

const Sidebar = () => {
  const { collapsed } = useSidebar();
  const location = useLocation();

  return (
    <aside
      className={`fixed top-0 left-0 z-50 h-screen overflow-y-auto bg-[#101928] text-slate-300 transition-all duration-300 ease-in-out border-r border-[#1e293b] select-none ${
        collapsed ? "w-0 lg:w-[76px]" : "w-[260px]"
      }`}
    >
      {/* Brand Header */}
      <div className="flex items-center h-[70px] px-5 border-b border-[#1e293b] whitespace-nowrap overflow-hidden">
        <Logo collapsed={collapsed} />
      </div>

      {/* Nav List - only Data Upload and Data Update */}
      <nav className="p-3.5 space-y-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            (item.path === "/admin/data-upload" && location.pathname === "/admin/data-upload") ||
            (item.path === "/admin/data-update" &&
              (location.pathname === "/admin/data-update" ||
                location.pathname === "/admin/data-add" ||
                location.pathname.startsWith("/admin/data-update")));

          return (
            <NavLink
              key={item.name}
              to={item.path}
              title={collapsed ? item.name : undefined}
              className={`flex items-center gap-3.5 w-full px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 whitespace-nowrap ${
                isActive
                  ? "bg-[#2563eb] text-white shadow-md shadow-blue-900/30 font-semibold"
                  : "text-slate-300 hover:text-white hover:bg-[#1e293b]/70"
              } ${collapsed ? "justify-center px-0" : ""}`}
            >
              <Icon className={`text-[19px] shrink-0 ${isActive ? "text-white" : "text-slate-400"}`} />
              {!collapsed && <span>{item.name}</span>}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;
