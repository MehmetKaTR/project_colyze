import React, { useState, useEffect } from 'react';

const ControlPanel = ({
  typeNo,
  progNo,
  onAdd,
  onDelete,
  onSave,
  onCalculate, // object: { key: function, ... }
  onTeach,     // object: { key: function, ... }
  onCropModeToggle,
}) => {
  // İlk measure seçimi olarak onCalculate'ın ilk key'i seçili olsun
  const initialMethod = Object.keys(onCalculate)[0] || '';
  const [selectedMethod, setSelectedMethod] = useState(initialMethod);

  // Measure seçimi değişince, teach seçimi aynı method ile senkronize ediliyor
  useEffect(() => {
    if (!onTeach[selectedMethod]) {
      // Eğer seçilen method için teach fonksiyonu yoksa ilk teach key seçilebilir
      const teachKeys = Object.keys(onTeach);
      if (teachKeys.length > 0) {
        setSelectedMethod(teachKeys.includes(selectedMethod) ? selectedMethod : teachKeys[0]);
      }
    }
  }, [selectedMethod, onTeach]);

  const handleCalculate = () => {
    if (onCalculate[selectedMethod]) {
      onCalculate[selectedMethod]();
    } else {
      alert('Seçilen Measure fonksiyonu bulunamadı!');
    }
  };

  const handleTeach = () => {
    if (onTeach[selectedMethod]) {
      onTeach[selectedMethod]();
    } else {
      alert('Seçilen Teach fonksiyonu bulunamadı!');
    }
  };


  const stopCamera = async () => {
  try {
    const response = await fetch('http://localhost:5050/stop_camera');
    const data = await response.json();
    console.log(data.status || data.error);
  } catch (error) {
    console.error('Kamera durdurulamadı:', error);
  }
};

const startCamera = async () => {
  try {
    const response = await fetch('http://localhost:5050/start_camera');
    const data = await response.json();
    console.log(data.status || data.error);
  } catch (error) {
    console.error('Kamera başlatılamadı:', error);
  }
};

  const deviceConfigurate = async () => {
  try {
    const response = await fetch('http://localhost:5050/ic4_configure');
    const data = await response.json();
    console.log(data.status || data.error);
  } catch (error) {
    console.error('Kamera başlatılamadı:', error);
  }
};


  return (
    <>
      <div className="w-[400px] h-[65vh] bg-gray-200 rounded-xl p-8 shadow-xl text-black flex flex-col space-y-4">
        <p className="flex justify-center text-[1.2rem]">TYPE NAME</p>
        <div className="w-full h-full flex justify-center items-center overflow-hidden bg-white drop-shadow-xl rounded-xl text-3xl font-semibold">
          P088
        </div>

        <div className="flex flex-row items-center space-x-4">
          <div className="flex justify-center items-center text-gray-600 text-[1rem] text-center w-[120px]">Type NO</div>
          <div className="flex justify-center items-center overflow-hidden bg-white drop-shadow-xl rounded-xl text-2xl w-[120px] h-[50px]">
            {typeNo !== null && typeNo !== undefined ? typeNo : '-'}
          </div>
        </div>

        <div className="flex flex-row items-center space-x-4">
          <div className="flex justify-center items-center text-gray-600 text-[1rem] text-center w-[120px]">Program NO</div>
          <div className="flex justify-center items-center overflow-hidden bg-white drop-shadow-xl rounded-xl text-2xl w-[120px] h-[50px]">
            {progNo !== null && progNo !== undefined ? progNo : '-'}
          </div>
        </div>

        <div className="flex flex-row items-stretch space-x-4">
          <button className="flex-1 bg-white hover:bg-gray-100 text-gray-800 font-semibold py-2 px-4 rounded shadow">
            TYPE SAVE
          </button>

          <button className="flex-1 bg-white hover:bg-gray-100 text-gray-800 font-semibold py-2 px-4 rounded shadow">
            TYPE DELETE
          </button>
        </div>

        <div className="flex flex-row items-stretch space-x-4">
          <button className="flex-1 bg-white hover:bg-gray-100 text-gray-800 font-semibold py-2 px-4 rounded shadow" onClick={onAdd}>
            TOOL ADD
          </button>

          <button className="flex-1 bg-white hover:bg-gray-100 text-gray-800 font-semibold py-2 px-4 rounded shadow" onClick={onDelete}>
            TOOL DELETE
          </button>
        </div>

        <div className="flex flex-row items-center space-x-4">
          <button className="w-full bg-white hover:bg-gray-100 text-gray-800 font-semibold py-2 px-4 rounded shadow" onClick={onSave}>
            TOOL SAVE
          </button>
        </div>

        {/* Measure & Teach Dropdown + Buttons */}
        <div className="flex flex-row items-center space-x-4">
          <select
            className="flex-1 bg-white text-gray-800 font-semibold py-2 px-3 rounded shadow"
            value={selectedMethod}
            onChange={(e) => setSelectedMethod(e.target.value)}
          >
            {Object.keys(onCalculate).map((method) => (
              <option key={method} value={method}>
                {method.toUpperCase()}
              </option>
            ))}
          </select>

          <button
            className="flex-1 bg-white hover:bg-gray-100 text-gray-800 font-semibold py-2 px-4 rounded shadow"
            onClick={handleCalculate}
          >
            MEASURE
          </button>

          <button
            className="flex-1 bg-white hover:bg-gray-100 text-gray-800 font-semibold py-2 px-4 rounded shadow"
            onClick={handleTeach}
            disabled={!onTeach[selectedMethod]}
            title={!onTeach[selectedMethod] ? "Teach fonksiyonu yok" : ""}
          >
            TEACH
          </button>
        </div>
      </div>

      <div className="w-[16px] h-[65vh] bg-gray-200 rounded-xl p-8 shadow-xl text-black flex flex-col justify-between items-center">
        {["Stop Camera", "Start Camera", "Capture", "Device", "Properties"].map((text, index) => (
          <div
            key={index}
            onClick={() => {
              if (text === "Stop Camera") stopCamera();
              if (text === "Start Camera") startCamera();
              if (text === "Device") deviceConfigurate();
              if (text === "Properties") onCropModeToggle(); // işte burada cropMode değişiyor
            }}
            className="transform rotate-90 whitespace-nowrap text-gray-600 cursor-pointer hover:text-blue-500 active:text-blue-700 active:shadow-inner active:shadow-blue-500 text-sm py-4"
          >
            {text}
          </div>
        ))}
      </div>
    </>
  );
};

export default ControlPanel;
