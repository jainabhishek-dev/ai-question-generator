import { AcademicCapIcon, LightBulbIcon, ClockIcon, HeartIcon } from "@heroicons/react/24/outline";

export default function Mission() {
  const values = [
    {
      icon: AcademicCapIcon,
      title: "Quality First",
      description: "Every question meets educational standards."
    },
    {
      icon: ClockIcon,
      title: "Time Efficient",
      description: "Hours of work completed in seconds."
    },
    {
      icon: LightBulbIcon,
      title: "AI Innovation",
      description: "Cutting-edge technology for education."
    },
    {
      icon: HeartIcon,
      title: "Educator Focused",
      description: "Built by an educator, for educators."
    }
  ];

  return (
    <section className="space-y-6" aria-labelledby="mission-heading">
      <h2 id="mission-heading" className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-100 mb-2 text-left">
        Our Mission
      </h2>
      <div className="w-16 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full mb-4" />
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 sm:p-6 border border-blue-100 dark:border-blue-800/30">
        <p className="text-sm sm:text-base text-gray-700 dark:text-gray-200 text-justify leading-relaxed mb-6">
          To help <span className="text-blue-600 dark:text-blue-400 font-semibold">educators and learners</span> create high-quality questions and worksheets in minutes, not hours. Instaku saves you time and ensures every question supports better learning outcomes.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {values.map((value, index) => (
            <div key={index} className="text-center">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 mb-2 mx-auto w-fit">
                <value.icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-xs mb-1">{value.title}</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">{value.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}