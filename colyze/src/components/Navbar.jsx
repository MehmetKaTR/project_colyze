import React, { useEffect } from 'react';
import { FaWindowMinimize, FaWindowMaximize, FaTimes } from "react-icons/fa";


export const Navbar = ({ menuOpen, setMenuOpen, activeTab, setActiveTab }) => {
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
  }, [menuOpen]);

  return (
    <nav className="fixed top-0 w-full z-50 bg-white shadow-md flex items-center h-16">
      {/* Logo ve drag alanı */}
      <div
        className="flex-1 flex items-center px-16 cursor-move"
        style={{ WebkitAppRegion: 'drag' }}
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

      {/* Desktop menü */}
      <div className="hidden md:flex items-center space-x-6">
        {["auto","measure","report"].map((tab) => (
          <a
            key={tab}
            href={`#${tab}`}
            className={`p-3 rounded-2xl transition-colors text-xl ${
              activeTab === tab
                ? "font-bold text-blue-500 bg-gray-200"  
                : "text-normal text-blue-500 hover:bg-gray-300"
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

      {/* Pencere kontrol divleri */}
      <div className="flex space-x-1 px-2" style={{ WebkitAppRegion: 'no-drag' }}>
        {[
          { action: "minimize", icon: <FaWindowMinimize /> },
          { action: "maximize", icon: <FaWindowMaximize /> },
          { action: "close", icon: <FaTimes /> }
        ].map(({ action, icon }) => (
          <div
            key={action}
            onClick={() => {
              if(action === "minimize") window.electron.minimize();
              if(action === "maximize") window.electron.maximize();
              if(action === "close") window.electron.close();
            }}
            className={`w-6 h-6 flex items-center justify-center cursor-pointer transition-colors duration-200 
                        ${action === "close" ? "bg-gray-500 hover:bg-red-600 text-white" : "bg-gray-200 hover:bg-gray-300 text-gray-800"} 
                        rounded`}
            title={action.charAt(0).toUpperCase() + action.slice(1)}
          >
            {icon}
          </div>
        ))}
      </div>
    </nav>
  );
};
