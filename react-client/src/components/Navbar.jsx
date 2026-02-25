import React, { useEffect, useState } from "react";
import { FaBars, FaWindowMinimize, FaWindowMaximize, FaTimes } from "react-icons/fa";

export const Navbar = ({ menuOpen, setMenuOpen, activeTab, setActiveTab }) => {
  const [time, setTime] = useState("");

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";

    const interval = setInterval(() => {
      const now = new Date();
      const pad = (n, z = 2) => String(n).padStart(z, "0");
      setTime(`${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [menuOpen]);

  const tabs = ["auto", "measure", "report"];

  return (
    <nav
      className="fixed top-0 w-full z-50 h-16 border-b border-slate-700/60 bg-slate-950/80 backdrop-blur-lg grid grid-cols-3 items-center"
      style={{ WebkitAppRegion: "drag" }}
    >
      <div className="flex items-center px-4 md:px-8 cursor-move">
        <a
          href="#auto"
          className="text-xl md:text-2xl font-extrabold tracking-wide text-sky-300"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab("auto");
            setMenuOpen(false);
          }}
        >
          COLYZE
        </a>
      </div>

      <div className="flex justify-center items-center select-none">
        <div className="flex items-center gap-2 rounded-2xl border border-sky-400/35 bg-gradient-to-r from-slate-900/95 via-slate-900/90 to-sky-950/70 px-3.5 py-1.5 shadow-lg shadow-sky-900/25">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(74,222,128,0.8)]" />
          <span className="text-[10px] md:text-xs font-semibold tracking-[0.16em] text-sky-200/90">LIVE</span>
          <span className="h-4 w-px bg-sky-400/30" />
          <span className="text-sm md:text-lg font-mono font-semibold text-sky-100 tracking-[0.08em]">
            {time}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-end space-x-2 md:space-x-4 pr-3 md:pr-4">
        <button
          type="button"
          className="md:hidden w-8 h-8 flex items-center justify-center rounded border border-slate-700 bg-slate-900 text-slate-200"
          style={{ WebkitAppRegion: "no-drag" }}
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-label="Open Menu"
        >
          <FaBars />
        </button>

        <div
          className="hidden md:flex items-center space-x-2"
          style={{ WebkitAppRegion: "no-drag" }}
        >
          {tabs.map((tab) => (
            <a
              key={tab}
              href={`#${tab}`}
              className={`px-3 py-1.5 rounded-xl transition-colors text-sm ${
                activeTab === tab
                  ? "font-semibold text-white bg-sky-600/70"
                  : "text-slate-200 hover:bg-slate-800"
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

        <div className="flex space-x-1" style={{ WebkitAppRegion: "no-drag" }}>
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
              className={`w-6 h-6 flex items-center justify-center cursor-pointer transition-colors duration-200 rounded ${
                action === "close"
                  ? "bg-slate-700 hover:bg-red-600 text-white"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-200"
              }`}
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
