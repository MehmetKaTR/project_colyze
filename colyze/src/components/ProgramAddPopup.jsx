import React, { useState } from 'react';

export const ProgramAddPopup = ({ isOpen, onClose, onSave, defaultTypeNo, lastProgNo }) => {
  const [progName, setProgName] = useState("");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white p-6 rounded-xl shadow-xl text-black w-96">
        <h2 className="text-xl font-bold mb-4">Add New Program</h2>
        <input
          type="text"
          value={progName}
          onChange={(e) => setProgName(e.target.value)}
          placeholder="Program Name"
          className="w-full border rounded p-2 mb-4"
        />
        <div className="flex justify-end space-x-4">
          <button onClick={onClose} className="px-4 py-2 rounded bg-gray-300">Cancel</button>
          <button onClick={() => onSave(defaultTypeNo, lastProgNo + 1, progName)} className="px-4 py-2 rounded bg-blue-600 text-white">Save</button>
        </div>
      </div>
    </div>
  );
};
