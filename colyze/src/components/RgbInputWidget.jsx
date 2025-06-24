import React from 'react';

const RgbInputWidget = ({ label, value, onChange }) => {
  return (
    <div className="flex flex-col items-center mr-3">
      <label className="text-black font-semibold mb-1">{label}</label>
      <input
        type="number"
        min={0}
        max={255}
        step={1}
        value={value}
        onChange={e => {
          let val = Number(e.target.value);
          if (isNaN(val)) val = 0;
          val = Math.min(255, Math.max(0, val));
          onChange(val);
        }}
        className="w-14 p-1 text-center border rounded text-black"
        onClick={e => e.stopPropagation()}
      />
    </div>
  );
};

export default RgbInputWidget;
