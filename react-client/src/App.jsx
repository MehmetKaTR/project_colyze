import React, { useEffect, useState } from 'react';
import { LoadingScreen } from './components/LoadingScreen'
import { Navbar } from "./components/Navbar";
import { MobileMenu } from "./components/MobileMenu";
import { FParams } from "./components/sections/FParams";
import { Auto } from "./components/sections/Auto";
import { Report } from "./components/sections/Report";
import ToastHost from "./components/common/ToastHost";
import { pushToast } from "./utils/toast";
import "./index.css"

function App() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("auto");

  useEffect(() => {
    const originalAlert = window.alert;

    const inferToastType = (message) => {
      const text = String(message || "").toLowerCase();
      if (
        text.includes("hata") ||
        text.includes("error") ||
        text.includes("failed") ||
        text.includes("bulunamad") ||
        text.includes("olmad")
      ) {
        return "error";
      }
      if (
        text.includes("ok") ||
        text.includes("tamam") ||
        text.includes("başar") ||
        text.includes("kaydedildi")
      ) {
        return "success";
      }
      return "info";
    };

    window.alert = (message) => {
      pushToast(message, inferToastType(message));
    };

    return () => {
      window.alert = originalAlert;
    };
  }, []);

  return (
    <>
    {!isLoaded && <LoadingScreen onComplete={() => setIsLoaded(true)} />}
    <ToastHost />
    {isLoaded && <div
        className={`h-screen overflow-hidden transition-opacity duration-700 ${
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
            <Auto />
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

      </div>}
    </>
  )
}

export default App
