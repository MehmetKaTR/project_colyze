import { RevealOnScroll } from "../RevealOnScroll";

export const About = () => {
  const frontendSkills = [
    "React",
    "Flutter",
    "TailwindCSS",
    "HTML/CSS",
  ];

  const backendSkills = ["Python", "C#", "C++", "MSQL", "PostgreSQL"];

  return (
    <section
      id="about"
      className="min-h-screen flex items-center justify-center py-20"
    >
      <RevealOnScroll>
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-3xl font-bold mb-8 bg-gradient-to-r from-blue-500 to-cyan-400 bg-clip-text text-transparent text-center">
            {" "}
            About Me
          </h2>

          <div className="rounded-xl p-8 border-white/10 border hover:-translate-y-1 transition-all">
            <p className="text-gray-300 mb-6">
            Enthusiastic developer with a strong background in computer vision, automation systems, and cross-platform application development.
             Experienced with OpenCV, YOLO, PyTorch, and Raspberry Pi for building intelligent systems.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-xl p-6 hover:-translate-y-1 transition-all">
                <h3 className="text-xl font-bold mb-4"> Frontend</h3>
                <div className="flex flex-wrap gap-2">
                  {frontendSkills.map((tech, key) => (
                    <span
                      key={key}
                      className="bg-blue-500/10 text-blue-500 py-1 px-3 rounded-full text-sm hover:bg-blue-500/20 
                                    hover:shadow-[0_2px_8px_rgba(59,130,246,0.2)] transition
                    "
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-xl p-6 hover:-translate-y-1 transition-all">
                <h3 className="text-xl font-bold mb-4"> Backend</h3>
                <div className="flex flex-wrap gap-2">
                  {backendSkills.map((tech, key) => (
                    <span
                      key={key}
                      className="bg-blue-500/10 text-blue-500 py-1 px-3 rounded-full text-sm hover:bg-blue-500/20 
                                    hover:shadow-[0_2px_8px_rgba(59,130,2246,0.2)] transition
                    "
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            <div className="p-6 rounded-xl border-white/10 border hover:-translate-y-1 transition-all">
              <h3 className="text-xl font-bold mb-4"> 🏫 Education </h3>
              <ul className="list-disc list-inside text-gray-300 space-y-2">
                <li>
                  <strong> B.S. in Computer Engineering </strong> - Uludağ University (Expected 2025)
                </li>
                <li>
                    Relevant Interests: Deep Learning, Computer Vision, Web App Development
                </li>
              </ul>
            </div>
            <div className="p-6 rounded-xl border-white/10 border hover:-translate-y-1 transition-all">
              <h3 className="text-xl font-bold mb-4"> 💼 Work Experience </h3>
              <div className="space-y-4 text-gray-300">
                <div>
                  <h4 className="font-semibold">
                    {" "}
                    Junior Software Developer at Ağasan Makina Kalıp San. ve Tic. Ltd. Şti. (Feb 2024 - Present)
                  </h4>
                  <p>
                    Developed software solutions using C# and Microsoft SQL Server to streamline processes and enhance operational efficiency.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold">
                    {" "}
                    Deep Learning Specialist at Otonom Araç Geliştirme Grubu - OTAGG (Nov 2024 - Present){" "}
                  </h4>
                  <p>
                    Working part-time on autonomous vehicle development, specializing in deep learning models and image processing using Python.
                  </p>
                </div>

                <div>
                    <h4 className="font-semibold">
                        Image Processing Intern at Searcly (Dec 2023 - Feb 2024)
                    </h4>
                    <p>
                        Assisted in developing image processing algorithms using Python and OpenCV, focusing on improving visual recognition capabilities.
                    </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </RevealOnScroll>
    </section>
  );
};