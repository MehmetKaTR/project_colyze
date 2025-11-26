import React, { useEffect, useState } from 'react';
import { FaWindowMinimize, FaWindowMaximize, FaTimes } from "react-icons/fa";

export const Navbar = ({ menuOpen, setMenuOpen, activeTab, setActiveTab }) => {
  const [time, setTime] = useState("");

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";

    const interval = setInterval(() => {
      const now = new Date();
      const pad = (n, z = 2) => String(n).padStart(z, '0');
      setTime(`${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [menuOpen]);

  return (
    <nav className="fixed top-0 w-full z-50 bg-white shadow-md grid grid-cols-3 items-center h-16"
    style={{ WebkitAppRegion: 'drag' }}>
      
      {/* Sol kısım: Logo */}
      <div
        className="flex items-center px-16 cursor-move"
      >
        <a
          href="#auto"
          className="text-2xl font-bold text-blue-500"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab("auto");
            setMenuOpen(false);
          }}
        >
          COLYZE
        </a>
      </div>

      {/* Orta kısım: Saat */}
      <div className="flex justify-center items-center select-none text-4xl font-mono text-blue-500">
        <div className="bg-white rounded-2xl p-2 shadow">{time}</div>
      </div>

      {/* Sağ kısım: Menü + pencere kontrolü */}
      <div className="flex items-center justify-end space-x-4 pr-4">
        {/* Menü */}
        <div className="hidden md:flex items-center space-x-4"
        style={{ WebkitAppRegion: 'no-drag' }}>
          {["auto", "measure", "report"].map((tab) => (
            <a
              key={tab}
              href={`#${tab}`}
              className={`px-3 py-2 rounded-2xl transition-colors text-lg ${
                activeTab === tab
                  ? "font-bold text-blue-500 bg-gray-200"
                  : "text-blue-500 hover:bg-gray-300"
              }`}
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

        {/* Pencere kontrol butonları */}
        <div className="flex space-x-1" style={{ WebkitAppRegion: 'no-drag' }}>
          {[
            { action: "minimize", icon: <FaWindowMinimize /> },
            { action: "maximize", icon: <FaWindowMaximize /> },
            { action: "close", icon: <FaTimes /> },
          ].map(({ action, icon }) => (
            <div
              key={action}
              onClick={() => {
                if (action === "minimize") window.electron.minimize();
                if (action === "maximize") window.electron.maximize();
                if (action === "close") window.electron.close();
              }}
              className={`w-6 h-6 flex items-center justify-center cursor-pointer transition-colors duration-200 
                ${
                  action === "close"
                    ? "bg-gray-500 hover:bg-red-600 text-white"
                    : "bg-gray-200 hover:bg-gray-300 text-gray-800"
                } 
                rounded`}
              title={action.charAt(0).toUpperCase() + action.slice(1)}
            >
              {icon}
            </div>
          ))}
        </div>
      </div>
    </nav>
  );
};
