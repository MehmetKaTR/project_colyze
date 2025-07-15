import React, { useState, useEffect } from 'react';
import { LoadingScreen } from './components/LoadingScreen'
import { Navbar } from "./components/Navbar";
import { MobileMenu } from "./components/MobileMenu";
import { FParams } from "./components/sections/FParams";
import { Auto } from "./components/sections/Auto";
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
        
        <Navbar menuOpen={menuOpen} setMenuOpen={setMenuOpen} setActiveTab={setActiveTab} />
        <MobileMenu menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
        
        {activeTab === "auto" && <Auto />}
        {activeTab === "f1" && <FParams />}
        {/*
        <About />
        <Projects />
        <Contact />
        */}
      </div>
    </>
  )
}

export default App
