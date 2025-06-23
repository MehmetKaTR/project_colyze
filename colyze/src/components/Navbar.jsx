import React, { useEffect } from 'react';

export const Navbar = ({ menuOpen, setMenuOpen, setActiveTab }) => {
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
  }, [menuOpen]);

  return (
    <nav className="fixed top-0 w-full z-40 bg-[rgba(10, 10, 10, 0.8)] backdrop-blur-lg border-b border-white/10 shadow-lg">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <a
            href="#auto"
            className="font-mono text-xl font-bold text-white"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab("auto");
              setMenuOpen(false);
            }}
          >
            <span className="text-blue-500">Colyze</span>
          </a>

          <div
            className="w-7 h-5 relative cursor-pointer z-40 md:hidden"
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            &#9776;
          </div>

          <div className="hidden md:flex items-center space-x-8">
            <a
              href="#auto"
              className="text-blue-500 hover:text-white transition-colors"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab("auto");
                setMenuOpen(false);
              }}
            >
              AUTO
            </a>
            <a
              href="#f1"
              className="text-blue-500 hover:text-white transition-colors"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab("f1");
                setMenuOpen(false);
              }}
            >
              F1 PARAMETER
            </a>
            <a
              href="#f2"
              className="text-blue-500 hover:text-white transition-colors"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab("f2");
                setMenuOpen(false);
              }}
            >
              F2 PARAMETER
            </a>
            <a
              href="#report"
              className="text-blue-500 hover:text-white transition-colors"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab("report");
                setMenuOpen(false);
              }}
            >
              REPORT
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
};
