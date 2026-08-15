import { useNavigate, useLocation } from 'react-router-dom';
import { Zap, History, Settings, Trophy, Wrench } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const NAV_ITEMS = [
    { path: '/editor', label: t('bottomNav.editor'), icon: Zap },
    { path: '/challenges', label: t('bottomNav.challenges', 'Tantangan'), icon: Trophy },
    { path: '/history', label: t('bottomNav.history'), icon: History },
    { path: '/tools', label: t('bottomNav.tools'), icon: Wrench },
    { path: '/settings', label: t('bottomNav.settings'), icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 sm:hidden border-t border-border bg-card backdrop-blur-xl">
      <div className="flex items-center justify-around h-14">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="relative flex flex-col items-center gap-0.5 px-3 py-1.5 text-xs font-medium transition-colors"
            >
              {isActive && (
                <motion.div
                  className="absolute -top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-accent rounded-full"
                  layoutId="bottomnav-indicator"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <Icon size={18} className={isActive ? 'text-accent' : 'text-muted-foreground'} />
              <span className={`text-[9px] ${isActive ? 'text-accent' : 'text-muted-foreground'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
