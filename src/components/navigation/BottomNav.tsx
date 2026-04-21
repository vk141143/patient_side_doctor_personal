import { Home, Calendar, MessageSquare, Wallet, User } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";

const navItems = [
  { icon: Home, label: "Home", path: "/dashboard" },
  { icon: Calendar, label: "Schedule", path: "/schedule" },
  { icon: MessageSquare, label: "Consults", path: "/consultations" },
  { icon: Wallet, label: "Earnings", path: "/earnings" },
  { icon: User, label: "Profile", path: "/profile" },
];

export const BottomNav = () => {
  const location = useLocation();

  return (
    <nav className="absolute bottom-0 left-0 right-0 bg-card border-t border-border z-50">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center w-16 h-full transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <item.icon className={`w-5 h-5 ${isActive ? "stroke-[2.5]" : ""}`} />
              <span className={`text-[10px] mt-1 ${isActive ? "font-semibold" : ""}`}>
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
