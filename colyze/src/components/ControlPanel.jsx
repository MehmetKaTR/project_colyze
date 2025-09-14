import React, { useState, useEffect, useMemo } from 'react';
import { ProgramAddPopup } from './ProgramAddPopup';
import { ProgramDeletePopup } from './ProgramDeletePopup';


const ControlPanel = ({
  typeNo,
  progNo,
  progName,
  allTypes = [],
  onAdd,
  onDelete,
  onSave,
  onCalculate = {},
  onTeach = {},
  onCropModeToggle,
  onTypeProgramChange, 
}) => {
  const initialMethod = Object.keys(onCalculate)[0] || '';
  const [selectedMethod, setSelectedMethod] = useState(initialMethod);

  const [selectedTypeIndex, setSelectedTypeIndex] = useState(0);
  const [selectedProgIndex, setSelectedProgIndex] = useState(0);
  const [editableName, setEditableName] = useState(progName || '');

  const [showAddPopup, setShowAddPopup] = useState(false);
  const [showDeletePopup, setShowDeletePopup] = useState(false);
  const [newProgName, setNewProgName] = useState("");


  const { groups, order } = useMemo(() => {
    const g = {};
    const o = [];
    (allTypes || []).forEach(item => {
      // grouped-format: item.programs varsa
      if (Array.isArray(item.programs)) {
        const typeKey = item.TypeNo ?? item.type_no ?? item.type;
        if (!g[typeKey]) {
          g[typeKey] = [];
          o.push(typeKey);
        }
        item.programs.forEach(p => {
          const progKey = p.ProgNo ?? p.program_no ?? p.progNo;
          const progName = p.ProgName ?? p.program_name ?? p.progName;
          if (!g[typeKey].some(x => String(x.progNo) === String(progKey))) g[typeKey].push({ progNo: progKey, progName });
        });
      } else {
        // flat-format: her eleman bir (TypeNo, ProgNo)
        const typeKey = item.TypeNo ?? item.type_no ?? item.type;
        const progKey = item.ProgNo ?? item.program_no ?? item.progNo;
        const progName = item.ProgName ?? item.program_name ?? item.progName;
        if (!g[typeKey]) {
          g[typeKey] = [];
          o.push(typeKey);
        }
        if (!g[typeKey].some(x => String(x.progNo) === String(progKey))) g[typeKey].push({ progNo: progKey, progName });
      }
    });
    return { groups: g, order: o };
  }, [allTypes]);

  const typesList = useMemo(() => order.map(t => ({ typeNo: t, programs: groups[t] || [] })), [groups, order]);

  useEffect(() => {
    if (!typesList || typesList.length === 0) return;
    let tIndex = 0;
    if (typeNo != null) {
      const idx = typesList.findIndex(t => String(t.typeNo) === String(typeNo));
      if (idx !== -1) tIndex = idx;
    }
    const progs = typesList[tIndex]?.programs ?? [];
    let pIndex = 0;
    if (progNo != null) {
      const pidx = progs.findIndex(p => String(p.progNo) === String(progNo));
      if (pidx !== -1) pIndex = pidx;
    }
    setSelectedTypeIndex(tIndex);
    setSelectedProgIndex(pIndex);
    setEditableName(progs[pIndex]?.progName ?? progName ?? '');
  }, [typesList, typeNo, progNo, progName]);

  const handleCalculate = () => {
    if (onCalculate[selectedMethod]) onCalculate[selectedMethod]();
    else alert('Seçilen Measure fonksiyonu bulunamadı!');
  };

  const handleTeach = () => {
    if (onTeach[selectedMethod]) onTeach[selectedMethod]();
    else alert('Seçilen Teach fonksiyonu bulunamadı!');
  };

  const stopCamera = async () => {
    try {
      const res = await fetch('http://localhost:5050/stop_camera');
      const data = await res.json();
      console.log(data.status || data.error);
    } catch (err) {
      console.error('Kamera durdurulamadı:', err);
    }
  };

  const startCamera = async () => {
    try {
      const res = await fetch('http://localhost:5050/start_camera');
      const data = await res.json();
      console.log(data.status || data.error);
    } catch (err) {
      console.error('Kamera başlatılamadı:', err);
    }
  };

  const deviceConfigurate = async () => {
    try {
      const res = await fetch('http://localhost:5050/ic4_configure');
      const data = await res.json();
      console.log(data.status || data.error);
    } catch (err) {
      console.error('Cihaz yapılandırılamadı:', err);
    }
  };

  // tip veya program seçimi değiştiğinde parent'a bildir
  const handleTypeChange = (e) => {
    const idx = Number(e.target.value);
    setSelectedTypeIndex(idx);
    setSelectedProgIndex(0);
    const t = typesList[idx];
    const p = t?.programs?.[0];
    setEditableName(p?.progName ?? '');
    if (onTypeProgramChange) onTypeProgramChange(t?.typeNo, p?.progNo, p?.progName);
  };

  const handleProgChange = (e) => {
    const pidx = Number(e.target.value);
    setSelectedProgIndex(pidx);
    const t = typesList[selectedTypeIndex];
    const p = t?.programs?.[pidx];
    setEditableName(p?.progName ?? '');
    if (onTypeProgramChange) onTypeProgramChange(t?.typeNo, p?.progNo, p?.progName);
  };

  return (
    <>
      <div className="w-[400px] h-[65vh] bg-gray-200 rounded-xl p-8 shadow-xl text-black flex flex-col space-y-4">
        <p className="flex justify-center text-[1.2rem]">TYPE NAME</p>
        <input
          type="text"
          value={editableName}
          onChange={(e) => setEditableName(e.target.value)}
          className="w-full h-12 text-center bg-white drop-shadow-xl rounded-xl text-2xl font-semibold"
        />

        <div className="flex flex-row items-center space-x-4">
          <div className="flex justify-center items-center text-gray-600 text-[1rem] text-center w-[120px]">Type NO</div>
          <select
            className="flex-1 bg-white drop-shadow-xl rounded-xl text-2xl h-[50px]"
            value={selectedTypeIndex}
            onChange={handleTypeChange}
          >
            {typesList.length === 0 ? (
              <option value={0}>-</option>
            ) : (
              typesList.map((t, idx) => (
                <option key={String(t.typeNo) + '_' + idx} value={idx}>
                  {t.typeNo}
                </option>
              ))
            )}
          </select>
        </div>

        <div className="flex flex-row items-center space-x-4">
          <div className="flex justify-center items-center text-gray-600 text-[1rem] text-center w-[120px]">Program NO</div>

          <select
            className="flex-1 bg-white drop-shadow-xl rounded-xl text-2xl h-[50px]"
            value={selectedProgIndex}
            onChange={handleProgChange}
          >
            {typesList[selectedTypeIndex] && typesList[selectedTypeIndex].programs.length > 0 ? (
              typesList[selectedTypeIndex].programs.map((p, idx) => (
                <option key={String(p.progNo) + '_' + idx} value={idx}>
                  {p.progNo} {p.progName ? `- ${p.progName}` : ''}
                </option>
              ))
            ) : (
              <option value={0}>-</option>
            )}
          </select>
        </div>

        <div className="flex flex-row items-stretch space-x-4">
          <button className="flex-1 bg-white hover:bg-gray-100 text-gray-800 font-semibold py-2 px-4 rounded shadow" onClick={() => setShowAddPopup(true)}>
            PROGRAM ADD
          </button>

          <button className="flex-1 bg-white hover:bg-gray-100 text-gray-800 font-semibold py-2 px-4 rounded shadow" onClick={() => setShowDeletePopup(true)}>
            PROGRAM DELETE
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

          <button className="flex-1 bg-white hover:bg-gray-100 text-gray-800 font-semibold py-2 px-4 rounded shadow" onClick={handleCalculate}>
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
        {['Stop Camera', 'Start Camera', 'Device', 'Properties'].map((text, index) => (
          <div
            key={index}
            onClick={() => {
              if (text === 'Stop Camera') stopCamera();
              if (text === 'Start Camera') startCamera();
              if (text === 'Device') deviceConfigurate();
              if (text === 'Properties') onCropModeToggle && onCropModeToggle();
            }}
            className="transform rotate-90 whitespace-nowrap text-gray-600 cursor-pointer hover:text-blue-500 active:text-blue-700 active:shadow-inner active:shadow-blue-500 text-sm py-4"
          >
            {text}
          </div>
        ))}
      </div>
      {/* Popup'lar kesinlikle return içindeyken */}
    <ProgramAddPopup
      isOpen={showAddPopup}
      onClose={() => setShowAddPopup(false)}
      defaultTypeNo={typesList[selectedTypeIndex]?.typeNo}
      lastProgNo={typesList[selectedTypeIndex]?.programs.slice(-1)[0]?.progNo ?? 0}
      onSave={async (typeNo, progNo, progName) => {
        const res = await fetch("http://localhost:5050/types", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ TypeNo: typeNo, ProgNo: progNo, ProgName: progName }),
        });
        const data = await res.json();
        console.log(data);
        setShowAddPopup(false);
      }}
    />

    <ProgramDeletePopup
      isOpen={showDeletePopup}
      onClose={() => setShowDeletePopup(false)}
      typeNo={typesList[selectedTypeIndex]?.typeNo}
      progNo={typesList[selectedTypeIndex]?.programs[selectedProgIndex]?.progNo}
      progName={typesList[selectedTypeIndex]?.programs[selectedProgIndex]?.progName}
      onDelete={async () => {
        const t = typesList[selectedTypeIndex];
        const p = t?.programs[selectedProgIndex];
        const res = await fetch("http://localhost:5050/types", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ TypeNo: t?.typeNo, ProgNo: p?.progNo }),
        });
        const data = await res.json();
        console.log(data);
        setShowDeletePopup(false);
      }}
    />
    </>
  );
};


export default ControlPanel;


