import { NavLink } from 'react-router-dom';

const tabs = [
  { to: '/', label: 'Check', icon: '\u26A1' },
  { to: '/dashboard', label: 'Home', icon: '\uD83D\uDCCA' },
  { to: '/obligations', label: 'Bills', icon: '\uD83D\uDCCB' },
  { to: '/purchases', label: 'Buys', icon: '\uD83D\uDED2' },
  { to: '/trends', label: 'Trends', icon: '\uD83D\uDCC8' },
  { to: '/settings', label: 'Settings', icon: '\u2699\uFE0F' },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 safe-area-bottom">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 text-xs transition-colors ${
                isActive ? 'text-blue-400' : 'text-gray-500'
              }`
            }
          >
            <span className="text-lg">{tab.icon}</span>
            <span>{tab.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
