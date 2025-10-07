import React, { useState } from 'react';

export const TypeAddPopup = ({ isOpen, onClose, onSave, defaultProgNo, lastTypeNo }) => {
  const [typeName, setTypeName] = useState("");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-opacity-50 backdrop-blur-sm z-50">
      <div className="bg-white p-6 rounded-xl shadow-xl text-black w-96">
        <h2 className="text-xl font-bold mb-4">Add New Type</h2>
        <input
          type="text"
          value={typeName}
          onChange={(e) => setTypeName(e.target.value)}
          placeholder="Type Name"
          className="w-full border rounded p-2 mb-4"
        />
        <div className="flex justify-end space-x-4">
          <button onClick={onClose} className="px-4 py-2 rounded bg-gray-300">Cancel</button>
          <button onClick={() => onSave(lastTypeNo + 1, defaultProgNo, typeName)} className="px-4 py-2 rounded bg-blue-600 text-white">Save</button>
        </div>
      </div>
    </div>
  );
};
