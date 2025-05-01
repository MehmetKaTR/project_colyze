import { RevealOnScroll } from "../RevealOnScroll";
import Camera from '../Camera';
import ControlPanel from "../ControlPanel";

export const Home = () => {
  return (
    <section
      id="home"
      className="min-h-screen pt-24 px-8 pb-8 bg-white text-white"
    >
      <div className="flex space-x-4">
        {/* İlk div */}
        <div className="w-full h-[700px] bg-gray-200 rounded-xl p-8 shadow-xl text-black">
        <Camera></Camera>
        </div>
        
        {/* İkinci div */}
        <ControlPanel></ControlPanel>
      </div>

    </section>
  );
};