"use client";

import { BarChart3, CalendarDays, Calculator, MessageCircle, Users, MoreHorizontal } from "lucide-react";

interface BottomTabBarProps {
  active: string;
  onSelect: (id: string) => void;
  onOpenMore: () => void;
}

const TABS = [
  { id: "dashboard", label: "Início", icon: BarChart3 },
  { id: "agenda", label: "Agenda", icon: CalendarDays },
  { id: "orcamento", label: "Orçamento", icon: Calculator },
  { id: "whatsapp", label: "WhatsApp", icon: MessageCircle },
  { id: "__more", label: "Mais", icon: MoreHorizontal },
];

export default function BottomTabBar({ active, onSelect, onOpenMore }: BottomTabBarProps) {
  return (
    <nav className="bottom-tab-bar lg:hidden">
      <div className="bottom-tab-bar-inner">
        {TABS.map((tab) => {
          const isActive = tab.id === "__more"
            ? !TABS.slice(0, -1).some((t) => t.id === active)
            : active === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => tab.id === "__more" ? onOpenMore() : onSelect(tab.id)}
              className={`bottom-tab ${isActive ? "bottom-tab-active" : ""}`}
            >
              <tab.icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
              <span className="bottom-tab-label">{tab.label}</span>
              {isActive && <span className="bottom-tab-indicator" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
