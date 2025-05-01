import React from 'react';

const ControlPanel = () => {
  return (
    <>
      <div className="w-[400px] h-full bg-gray-200 rounded-xl p-8 shadow-xl text-black flex flex-col space-y-4">
        <p className="flex justify-center text-[1.2rem]">TYPE NAME</p>
        <div className="w-full h-full flex justify-center bg-white drop-shadow-xl rounded-xl text-3xl font-semibold">P088</div>

        <div className="flex flex-row items-center space-x-4">
          <div className="flex justify-center items-center text-gray-600 text-[1rem] text-center w-[120px]">
            Program NO
          </div>
          <div className="flex justify-center items-center bg-white drop-shadow-xl rounded-xl text-2xl w-[120px] h-[50px]">
            1
          </div>
        </div>

        <div className="flex flex-row items-center space-x-4">
          <div className="flex justify-center items-center text-gray-600 text-[1rem] text-center w-[120px]">
            Type NO
          </div>
          <div className="flex justify-center items-center bg-white drop-shadow-xl rounded-xl text-2xl w-[120px] h-[50px]">
            2
          </div>
        </div>

        <div className="flex flex-row items-center space-x-4">
          <button className="bg-white hover:bg-gray-100 text-gray-800 font-semibold py-2 px-4 rounded shadow">
            TYPE SAVE
          </button>

          <button className="bg-white hover:bg-gray-100 text-gray-800 font-semibold py-2 px-4 rounded shadow">
            TYPE DELETE
          </button>
        </div>

        <div className="flex flex-row items-center space-x-4">
          <button className="bg-white hover:bg-gray-100 text-gray-800 font-semibold py-2 px-4 rounded shadow">
            TOOL ADD
          </button>

          <button className="bg-white hover:bg-gray-100 text-gray-800 font-semibold py-2 px-4 rounded shadow">
            TOOL DELETE
          </button>
        </div>

        <div className="flex flex-row items-center space-x-4">
          <button className="w-full bg-white hover:bg-gray-100 text-gray-800 font-semibold py-2 px-4 rounded shadow">
            TOOL SAVE
          </button>
        </div>
      </div>

      <div className="w-[16px] bg-gray-200 rounded-xl p-8 shadow-xl text-black flex flex-col space-y-24">
        <div className="transform rotate-90 whitespace-nowrap text-gray-600 cursor-pointer hover:text-blue-500 active:text-blue-700 active:shadow-inner active:shadow-blue-500">
          Stop Camera
        </div>
        <div className="transform rotate-90 whitespace-nowrap text-gray-600 cursor-pointer hover:text-blue-500 active:text-blue-700 active:shadow-inner active:shadow-blue-500">
          Start Camera
        </div>
        <div className="transform rotate-90 whitespace-nowrap text-gray-600 cursor-pointer hover:text-blue-500 active:text-blue-700 active:shadow-inner active:shadow-blue-500">
          Capture
        </div>
      </div>
    </>
  );
};

export default ControlPanel;
