import React from "react";

const RgbInputWidget = ({ label, value, onChange }) => {
  return (
    <div className="flex flex-col items-center mr-2">
      <label className="text-slate-300 font-semibold mb-1 text-[11px]">{label}</label>
      <input
        type="number"
        min={0}
        max={255}
        step={1}
        value={value}
        onChange={(e) => {
          let val = Number(e.target.value);
          if (isNaN(val)) val = 0;
          val = Math.min(255, Math.max(0, val));
          onChange(val);
        }}
        className="w-14 p-1 text-center rounded border border-slate-600 bg-slate-950 text-slate-100"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
};

export default RgbInputWidget;
