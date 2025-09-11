import React, { useEffect } from 'react';

export const Navbar = ({ menuOpen, setMenuOpen, setActiveTab }) => {
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
  }, [menuOpen]);

  return (
    <nav className="fixed top-0 w-full z-50 bg-white shadow-md flex items-center h-14">
      {/* Logo ve drag alanı */}
      <div
        className="flex-1 flex items-center px-16 cursor-move"
        style={{ WebkitAppRegion: 'drag' }}
      >
        <a
          href="#auto"
          className="font-mono text-lg font-bold text-blue-500"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab("auto");
            setMenuOpen(false);
          }}
        >
          Colyze
        </a>
      </div>

      {/* Desktop menü */}
      <div className="hidden md:flex items-center space-x-6">
        {["auto","f1","f2","report"].map((tab) => (
          <a
            key={tab}
            href={`#${tab}`}
            className="text-blue-500 hover:bg-gray-300 transition-colors"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab(tab);
              setMenuOpen(false);
            }}
          >
            {tab.toUpperCase()}
          </a>
        ))}
      </div>

      {/* Pencere kontrol divleri */}
      <div className="flex space-x-1 px-2" style={{ WebkitAppRegion: 'no-drag' }}>
        {[
          { action: "minimize", symbol: "—" },
          { action: "maximize", symbol: "□" },
          { action: "close", symbol: "×" }
        ].map(({ action, symbol }) => (
          <div
            key={action}
            onClick={() => {
              if(action === "minimize") window.electron.minimize();
              if(action === "maximize") window.electron.maximize();
              if(action === "close") window.electron.close();
            }}
            className="w-6 h-6 bg-gray-200 hover:bg-gray-300 rounded flex items-center justify-center text-gray-800 text-sm cursor-pointer transition-colors duration-200"
            title={action.charAt(0).toUpperCase() + action.slice(1)}
          >
            {symbol}
          </div>
        ))}
      </div>
    </nav>
  );
};
