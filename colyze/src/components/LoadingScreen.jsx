import { useEffect, useState } from "react";
import logo from "../assets/colyze_logo.png"; // yolunu kontrol et!

export const LoadingScreen = ({ onComplete }) => {
  const [text, setText] = useState("");
  const fullText = "Agasan Colyze";

  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      setText(fullText.substring(0, index));
      index++;

      if (index > fullText.length) {
        clearInterval(interval);

        setTimeout(() => {
          onComplete();
        }, 1000);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 bg-black text-gray-100 flex flex-col items-center justify-center">
      {/* Logo */}
      <img
        src={logo}
        alt="Logo"
        className="w-64 h-64 mb-8 opacity-0 animate-fadeInScale"
      />

      {/* Yazı */}
      <div className="mb-4 text-4xl font-semibold">
        {text} <span className="animate-blink ml-1"> | </span>
      </div>

      {/* Progress bar */}
      <div className="w-[200px] h-[2px] bg-gray-800 rounded relative overflow-hidden">
        <div className="w-[40%] h-full bg-blue-500 shadow-[0_0_15px_#3b82f6] animate-loading-bar"></div>
      </div>
    </div>
  );
};
