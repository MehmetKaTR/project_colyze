import React, { useState, useEffect, useMemo } from 'react';
import { ProgramAddPopup } from './ProgramAddPopup';
import { ProgramDeletePopup } from './ProgramDeletePopup';
import { addProgram, addType, deleteProgram, deleteType } from "./Flask";
import { TypeAddPopup } from "./TypeAddPopup";
import { TypeDeletePopup } from "./TypeDeletePopup";


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
  refreshTypes,
  setMeasurementType,
  cameraProfiles = [],
  activeCameraProfileId = "",
  onRefreshCameraProfiles,
  onCreateCameraProfile,
  onActivateCameraProfile,
  onDeleteCameraProfile,
  onSaveCameraProfileSettings,
  edgePreviewEnabled = false,
  onEdgePreviewToggle,
}) => {
  const initialMethod = Object.keys(onCalculate)[0] || '';
  const [selectedMethod, setSelectedMethod] = useState(initialMethod);

  const [selectedTypeIndex, setSelectedTypeIndex] = useState(0);
  const [selectedProgIndex, setSelectedProgIndex] = useState(0);
  const [editableName, setEditableName] = useState(progName || '');

  const [showProgAddPopup, setShowProgAddPopup] = useState(false);
  const [showProgDeletePopup, setShowProgDeletePopup] = useState(false);

  const [showTypeAddPopup, setShowTypeAddPopup] = useState(false);
  const [showTypeDeletePopup, setShowTypeDeletePopup] = useState(false);

  const [newProgName, setNewProgName] = useState("");
  const [selectedCameraProfileId, setSelectedCameraProfileId] = useState("");
  const [showCameraProfilePopup, setShowCameraProfilePopup] = useState(false);
  const [newCameraProfileName, setNewCameraProfileName] = useState("");
  const [previewTick, setPreviewTick] = useState(0);


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

  useEffect(() => {
    if (!cameraProfiles.length) {
      setSelectedCameraProfileId("");
      return;
    }

    const preferredId = activeCameraProfileId || cameraProfiles[0].id;
    const current = cameraProfiles.find((p) => p.id === preferredId) || cameraProfiles[0];
    setSelectedCameraProfileId(current.id);
  }, [cameraProfiles, activeCameraProfileId]);

  const handleCameraProfileChange = (e) => {
    const profileId = e.target.value;
    setSelectedCameraProfileId(profileId);
    if (profileId && onActivateCameraProfile) {
      onActivateCameraProfile(profileId);
    }
  };

  const selectedCameraProfileName = useMemo(() => {
    const selected = cameraProfiles.find((p) => p.id === selectedCameraProfileId);
    return selected?.name || "No profile";
  }, [cameraProfiles, selectedCameraProfileId]);

  const selectedCameraMeta = useMemo(() => {
    const selected = cameraProfiles.find((p) => p.id === selectedCameraProfileId);
    return selected?.camera_identity || null;
  }, [cameraProfiles, selectedCameraProfileId]);

  const cameraLabelForProfile = (profile) => {
    const identity = profile?.camera_identity || {};
    const deviceName = identity.device_name || "Unknown Device";
    const unique = identity.device_unique_name || "";
    const shortUnique = unique ? unique.slice(-8) : "";
    return shortUnique
      ? `${profile.name} | ${deviceName} (${shortUnique})`
      : `${profile.name} | ${deviceName}`;
  };

  useEffect(() => {
    if (!showCameraProfilePopup) return undefined;
    const intervalId = setInterval(() => {
      setPreviewTick((v) => v + 1);
    }, 900);
    return () => clearInterval(intervalId);
  }, [showCameraProfilePopup, selectedCameraProfileId]);

  const handleCalculate = () => {
    console.log(selectedMethod)
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
      const endpoint = selectedCameraProfileId
        ? `http://localhost:5050/start_camera?profile_id=${encodeURIComponent(selectedCameraProfileId)}`
        : 'http://localhost:5050/start_camera';
      const res = await fetch(endpoint);
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

  const setTypeAndProgNoAfterDeleting = async () => {
    if (!typesList || typesList.length === 0) {
      setSelectedTypeIndex(0);
      setSelectedProgIndex(0);
      setEditableName('');
      return;
    }

    const sortedTypes = [...typesList].sort((a, b) => Number(a.typeNo) - Number(b.typeNo));
    const t = sortedTypes[0]; 

    const sortedPrograms = (t.programs || []).sort((a, b) => Number(a.progNo) - Number(b.progNo));
    const p = sortedPrograms[0]; 

    const tIndex = typesList.findIndex(x => String(x.typeNo) === String(t.typeNo));
    const pIndex = t.programs.findIndex(x => String(x.progNo) === String(p?.progNo));

    setSelectedTypeIndex(tIndex);
    setSelectedProgIndex(pIndex);
    setEditableName(p?.progName ?? '');

    if (onTypeProgramChange) {
      onTypeProgramChange(t?.typeNo, p?.progNo, p?.progName);
    }
  };

  const managementButtons = [
    {
      key: "type-add",
      label: "TYPE ADD",
      icon: "+T",
      onClick: () => setShowTypeAddPopup(true),
      className: "border-sky-500/40 bg-sky-500/15 text-sky-100 hover:bg-sky-500/25",
    },
    {
      key: "type-del",
      label: "TYPE DELETE",
      icon: "-T",
      onClick: () => setShowTypeDeletePopup(true),
      className: "border-rose-500/40 bg-rose-500/15 text-rose-100 hover:bg-rose-500/25",
    },
    {
      key: "prog-add",
      label: "PROGRAM ADD",
      icon: "+P",
      onClick: () => setShowProgAddPopup(true),
      className: "border-emerald-500/40 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25",
    },
    {
      key: "prog-del",
      label: "PROGRAM DELETE",
      icon: "-P",
      onClick: () => setShowProgDeletePopup(true),
      className: "border-amber-500/40 bg-amber-500/15 text-amber-100 hover:bg-amber-500/25",
    },
    {
      key: "tool-add",
      label: "TOOL ADD",
      icon: "+L",
      onClick: onAdd,
      className: "border-indigo-500/40 bg-indigo-500/15 text-indigo-100 hover:bg-indigo-500/25",
    },
    {
      key: "tool-del",
      label: "TOOL DELETE",
      icon: "-L",
      onClick: onDelete,
      className: "border-fuchsia-500/40 bg-fuchsia-500/15 text-fuchsia-100 hover:bg-fuchsia-500/25",
    },
  ];

  const cameraControls = [
    {
      key: "start",
      label: "START CAMERA",
      icon: "ON",
      onClick: startCamera,
      className: "border-emerald-500/40 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25",
    },
    {
      key: "stop",
      label: "STOP CAMERA",
      icon: "OFF",
      onClick: stopCamera,
      className: "border-rose-500/40 bg-rose-500/15 text-rose-100 hover:bg-rose-500/25",
    },
    {
      key: "device",
      label: "DEVICE",
      icon: "CFG",
      onClick: deviceConfigurate,
      className: "border-slate-500/50 bg-slate-600/25 text-slate-100 hover:bg-slate-600/40",
    },
    {
      key: "roi",
      label: "ROI FOCUS",
      icon: "ROI",
      onClick: () => onCropModeToggle && onCropModeToggle(),
      className: "border-cyan-500/40 bg-cyan-500/15 text-cyan-100 hover:bg-cyan-500/25",
    },
    {
      key: "edge-preview",
      label: edgePreviewEnabled ? "EDGE PREVIEW ON" : "EDGE PREVIEW OFF",
      icon: "EYE",
      onClick: () => onEdgePreviewToggle && onEdgePreviewToggle(),
      className: edgePreviewEnabled
        ? "border-lime-400/50 bg-lime-500/20 text-lime-100 hover:bg-lime-500/30"
        : "border-slate-500/50 bg-slate-600/25 text-slate-100 hover:bg-slate-600/40",
    },
  ];

  return (
    <>
      <div className="h-full min-h-0 flex gap-2.5 xl:gap-3">
      <div className="flex-1 min-w-0 h-full min-h-0 rounded-3xl border border-slate-700/60 bg-slate-900/80 p-3 xl:p-4 shadow-xl text-slate-100 flex flex-col gap-2 xl:gap-3 overflow-y-auto">
        <p className="text-center text-xs uppercase tracking-[0.18em] text-slate-400">Type Name</p>
        <input
          type="text"
          value={editableName}
          onChange={(e) => setEditableName(e.target.value)}
          className="w-full h-10 xl:h-11 text-center bg-slate-950 border border-slate-700 rounded-xl text-base font-semibold text-slate-100"
        />

        <div className="flex flex-row items-center gap-3 xl:gap-4">
          <div className="flex justify-center items-center text-slate-400 text-sm text-center w-[110px] xl:w-[128px]">Type No</div>
          <select
            className="flex-1 bg-slate-950 border border-slate-700 rounded-xl text-sm h-10 xl:h-11 px-2"
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

        <div className="flex flex-row items-center gap-3 xl:gap-4">
          <div className="flex justify-center items-center text-slate-400 text-sm text-center w-[110px] xl:w-[128px]">Program No</div>

          <select
            className="flex-1 bg-slate-950 border border-slate-700 rounded-xl text-sm h-10 xl:h-11 px-2"
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

        <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-2.5 xl:p-3">
          <button
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 xl:py-2.5 px-3 rounded-lg text-sm"
            onClick={async () => {
              onRefreshCameraProfiles && await onRefreshCameraProfiles();
              setShowCameraProfilePopup(true);
            }}
          >
            CAMERA PROFILES
          </button>
          <p className="mt-1 text-[11px] text-slate-400 text-center truncate">
            Active: {selectedCameraMeta?.device_name ? `${selectedCameraProfileName} (${selectedCameraMeta.device_name})` : selectedCameraProfileName}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {managementButtons.map((button) => (
            <button
              key={button.key}
              type="button"
              onClick={button.onClick}
              className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 font-semibold transition-colors xl:py-2.5 ${button.className}`}
            >
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-md bg-slate-950/65 px-1 text-[10px] font-bold leading-none tracking-wide">
                {button.icon}
              </span>
              <span className="text-[12px] leading-none">{button.label}</span>
            </button>
          ))}
        </div>

        <div className="mt-auto flex flex-row items-center pt-1">
          <button className="h-11 w-full bg-sky-600 hover:bg-sky-500 text-white font-semibold px-4 rounded-lg" onClick={onSave}>
            TOOL SAVE
          </button>
        </div>

        <div className="flex flex-row items-center gap-2">
          <select
            className="flex-1 bg-slate-950 border border-slate-700 text-slate-100 font-semibold py-2 xl:py-2.5 px-3 rounded-lg"
            value={selectedMethod}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedMethod(val);      // mevcut method’u güncelle
              setMeasurementType(val.toUpperCase());     // measurementType’ı da güncelle
            }}
          >
            {Object.keys(onCalculate).map((method) => (
              <option key={method} value={method}>
                {method.toUpperCase()}
              </option>
            ))}
          </select>

          <button className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 xl:py-2.5 px-4 rounded-lg" onClick={handleCalculate}>
            MEASURE
          </button>

          <button
            className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold py-2 xl:py-2.5 px-4 rounded-lg disabled:opacity-50"
            onClick={handleTeach}
            disabled={!onTeach[selectedMethod]}
            title={!onTeach[selectedMethod] ? "Teach fonksiyonu yok" : ""}
          >
            TEACH
          </button>
        </div>
      </div>

      <div className="w-[132px] h-full min-h-0 rounded-3xl border border-slate-700/60 bg-slate-900/80 p-2.5 shadow-xl text-slate-200 grid grid-rows-5 gap-2">
        {cameraControls.map((control) => (
          <button
            type="button"
            key={control.key}
            onClick={control.onClick}
            className={`w-full h-full min-h-0 rounded-xl border px-2 py-2 text-center text-[11px] font-semibold leading-tight transition-colors ${control.className}`}
          >
            <span className="mb-1 inline-flex min-w-[30px] items-center justify-center rounded-md bg-slate-950/70 px-1.5 py-0.5 text-[10px] font-bold text-slate-100">
              {control.icon}
            </span>
            <span className="block">{control.label}</span>
          </button>
        ))}
      </div>
      </div>

      {showCameraProfilePopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 backdrop-blur-sm p-4">
          <div className="w-full max-w-4xl rounded-2xl border border-slate-700 bg-slate-900 p-4 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold tracking-wide text-slate-100">Camera Profile Manager</h3>
              <button
                className="text-slate-300 hover:text-white text-xs border border-slate-600 rounded-md px-2 py-1"
                onClick={() => setShowCameraProfilePopup(false)}
              >
                CLOSE
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_360px]">
              <div className="space-y-3">
                <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-3">
                  <label className="text-xs text-slate-400">Profiles</label>
                  <select
                    className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg text-sm h-10 px-2"
                    value={selectedCameraProfileId}
                    onChange={handleCameraProfileChange}
                  >
                    {cameraProfiles.length === 0 ? (
                      <option value="">No profile</option>
                    ) : (
                      cameraProfiles.map((profile) => (
                        <option key={profile.id} value={profile.id}>
                          {cameraLabelForProfile(profile)}
                        </option>
                      ))
                    )}
                  </select>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    <button
                      className="bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-100 font-semibold py-2 px-3 rounded-lg text-xs"
                      onClick={() => onRefreshCameraProfiles && onRefreshCameraProfiles()}
                    >
                      REFRESH
                    </button>
                    <button
                      className="bg-sky-700 hover:bg-sky-600 text-white font-semibold py-2 px-3 rounded-lg text-xs"
                      onClick={() => {
                        if (!selectedCameraProfileId) return;
                        onActivateCameraProfile && onActivateCameraProfile(selectedCameraProfileId);
                      }}
                    >
                      PREVIEW
                    </button>
                    <button
                      className="bg-rose-700 hover:bg-rose-600 text-white font-semibold py-2 px-3 rounded-lg text-xs disabled:opacity-50"
                      disabled={!selectedCameraProfileId}
                      onClick={async () => {
                        if (!selectedCameraProfileId || !onDeleteCameraProfile) return;
                        const ok = window.confirm("Bu profili silmek istiyor musun?");
                        if (!ok) return;
                        await onDeleteCameraProfile(selectedCameraProfileId);
                      }}
                    >
                      DELETE
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-3">
                  <p className="text-xs text-slate-300 mb-2">
                    1) <span className="font-semibold">Device</span> ile ayar yap.
                    2) Aşağıdan isim verip `devicef1.xml` kaydını profile dönüştür.
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCameraProfileName}
                      onChange={(e) => setNewCameraProfileName(e.target.value)}
                      placeholder="Profile name"
                      className="flex-1 h-9 bg-slate-950 border border-slate-700 rounded-lg px-2 text-sm text-slate-100"
                    />
                    <button
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-3 rounded-lg text-xs"
                      onClick={async () => {
                        const profileName = newCameraProfileName.trim();
                        if (!profileName || !onCreateCameraProfile) return;
                        await onCreateCameraProfile(profileName);
                        setNewCameraProfileName("");
                        onRefreshCameraProfiles && await onRefreshCameraProfiles();
                      }}
                    >
                      SAVE XML AS PROFILE
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-3">
                <p className="text-xs text-slate-400 mb-2">Live Preview ({selectedCameraProfileName})</p>
                <div className="rounded-lg overflow-hidden border border-slate-700 bg-black aspect-video">
                  <img
                    src={`http://localhost:5050/current_frame?t=${previewTick}`}
                    alt="camera preview"
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="mt-2 text-[11px] text-slate-500">
                  Profile seçince kamera o profile geçer. Preview ile kontrol edip devam edebilirsin.
                </p>
                {selectedCameraMeta && (
                  <div className="mt-2 rounded-md border border-slate-700 bg-slate-900/80 p-2 text-[11px] text-slate-300">
                    <p className="truncate">Device: {selectedCameraMeta.device_name || "-"}</p>
                    <p className="truncate">Unique: {selectedCameraMeta.device_unique_name || "-"}</p>
                    <p className="truncate">Format: {selectedCameraMeta.videoformat || "-"}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
    <ProgramAddPopup
      isOpen={showProgAddPopup}
      onClose={() => setShowProgAddPopup(false)}
      defaultTypeNo={typesList[selectedTypeIndex]?.typeNo}
      lastProgNo={typesList[selectedTypeIndex]?.programs.slice(-1)[0]?.progNo ?? 0}
      onSave={async (typeNo, progNo, progName) => {
        const data = await addProgram(typeNo, progNo, progName);
        console.log(data);
        setShowProgAddPopup(false);
        if (typeof refreshTypes === "function") {
          await refreshTypes();
        }
      }}
    />

    <TypeAddPopup
      isOpen={showTypeAddPopup}
      onClose={() => setShowTypeAddPopup(false)}
      defaultProgNo={1}
      lastTypeNo={typesList.length > 0 ? typesList[typesList.length - 1].typeNo : 0}
      onSave={async (typeNo, _, typeName) => {
        const data = await addType(typeNo, typeName);
        console.log("Yeni type eklendi:", data);
        setShowTypeAddPopup(false);
        if (typeof refreshTypes === "function") {
          await refreshTypes();
        }
      }}
    />

    <ProgramDeletePopup
      isOpen={showProgDeletePopup}
      onClose={() => setShowProgDeletePopup(false)}
      typeNo={typesList[selectedTypeIndex]?.typeNo}
      progNo={typesList[selectedTypeIndex]?.programs[selectedProgIndex]?.progNo}
      progName={typesList[selectedTypeIndex]?.programs[selectedProgIndex]?.progName}
      onDelete={async () => {
        const t = typesList[selectedTypeIndex];
        const p = t?.programs[selectedProgIndex];
        const data = await deleteProgram(t?.typeNo, p?.progNo);
        console.log(data);
        setShowProgDeletePopup(false);
        if (typeof refreshTypes === "function") {
          await refreshTypes();
        }
        setTypeAndProgNoAfterDeleting();
      }}
    />

    <TypeDeletePopup
      isOpen={showTypeDeletePopup}
      onClose={() => setShowTypeDeletePopup(false)}
      typeNo={typesList[selectedTypeIndex]?.typeNo}
      onDelete={async () => {
        const t = typesList[selectedTypeIndex];
        const data = await deleteType(t?.typeNo);
        console.log(data);
        setShowTypeDeletePopup(false);
        if (typeof refreshTypes === "function") {
          await refreshTypes();
        }
        setTypeAndProgNoAfterDeleting();
      }}
    />

    </>
  );
};


export default ControlPanel;
