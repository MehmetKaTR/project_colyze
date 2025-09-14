import React from 'react';

export const ProgramDeletePopup = ({ isOpen, onClose, onDelete, typeNo, progNo, progName }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white p-6 rounded-xl shadow-xl text-black w-96">
        <h2 className="text-xl font-bold mb-4">Program Sil</h2>
        <p>
          Emin misiniz silmek istediğinize? <br />
          <strong>
            TypeNo: {typeNo}, ProgNo: {progNo}, Name: {progName}
          </strong>
        </p>
        <div className="flex justify-end space-x-4 mt-4">
          <button onClick={onClose} className="px-4 py-2 rounded bg-gray-300">Cancel</button>
          <button onClick={onDelete} className="px-4 py-2 rounded bg-red-600 text-white">Delete</button>
        </div>
      </div>
    </div>
  );
};
