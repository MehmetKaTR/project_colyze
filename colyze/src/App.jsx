import React, { useState, useEffect } from 'react';
import { LoadingScreen } from './components/LoadingScreen'
import { Navbar } from "./components/Navbar";
import { MobileMenu } from "./components/MobileMenu";
import { FParams } from "./components/sections/FParams";
import { Auto } from "./components/sections/Auto";
import { Report } from "./components/sections/Report";
import { Projects } from "./components/sections/Projects";
import "./index.css"

function App() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("auto");

  return (
    <>{!isLoaded && <LoadingScreen onComplete={() => setIsLoaded(true)} />}{" "}
    <div
        className={`min-h-screen transition-opacity duration-700 ${
          isLoaded ? "opacity-100" : "opacity-0"
        } bg-black text-gray-100`}
      >
        
        <Navbar menuOpen={menuOpen} setMenuOpen={setMenuOpen} activeTab={activeTab} setActiveTab={setActiveTab} />
        <MobileMenu menuOpen={menuOpen} setMenuOpen={setMenuOpen} setActiveTab={setActiveTab} />
        {/*
        {activeTab === "auto" && <Auto />}
        {activeTab === "f1" && <FParams />}
        {activeTab === "report" && <Report />}
        */}

        {activeTab === "auto" ? (
          <div className="block">
            <Auto key={Date.now()} />
          </div>
        ) : (
          <div className="hidden"></div>
        )}
        <div className={activeTab === "measure" ? "block" : "hidden"}>
          <FParams />
        </div>
        <div className={activeTab === "report" ? "block" : "hidden"}>
          <Report />
        </div>

      </div>
    </>
  )
}

export default App
