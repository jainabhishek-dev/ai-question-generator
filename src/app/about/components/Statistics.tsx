import { DocumentTextIcon, UsersIcon, ClockIcon, SparklesIcon } from "@heroicons/react/24/solid";

export default function Statistics() {
  const stats = [
    { icon: DocumentTextIcon, value: "10K+", label: "Questions Created", color: "from-blue-500 to-blue-600" },
    { icon: UsersIcon, value: "500+", label: "Active Users", color: "from-green-500 to-green-600" },
    { icon: ClockIcon, value: "95%", label: "Time Saved", color: "from-purple-500 to-purple-600" },
    { icon: SparklesIcon, value: "50+", label: "Subject Areas", color: "from-orange-500 to-orange-600" }
  ];

  return (
    <section className="py-4" aria-labelledby="stats-heading">
      <h2 id="stats-heading" className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-100 mb-2 text-left">
        Making a Real Impact
      </h2>
      <div className="w-16 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full mb-4" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 text-center">
            <div className={`bg-gradient-to-br ${stat.color} p-2 rounded-lg w-fit mx-auto mb-2`}>
              <stat.icon className="h-5 w-5 text-white" />
            </div>
            <div className="text-lg font-bold text-gray-800 dark:text-gray-100">{stat.value}</div>
            <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">{stat.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}