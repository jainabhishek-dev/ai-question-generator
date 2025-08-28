import { ShieldCheckIcon, LockClosedIcon, EyeIcon, UsersIcon } from "@heroicons/react/24/outline";

export default function Trust() {
  const trustFactors = [
    {
      icon: ShieldCheckIcon,
      title: "Accuracy & Quality",
      description: "AI trained on diverse, reliable educational sources and reviewed by experts.",
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-50 dark:bg-green-900/20"
    },
    {
      icon: LockClosedIcon,
      title: "Privacy First",
      description: "Your data is never shared or sold. Industry-standard security protects your information.",
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-900/20"
    },
    {
      icon: EyeIcon,
      title: "Transparency",
      description: "Open about our AI processes and continuously improving based on user feedback.",
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-50 dark:bg-purple-900/20"
    },
    {
      icon: UsersIcon,
      title: "Educator Driven",
      description: "Built with input from teachers and learners to meet real classroom needs.",
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-50 dark:bg-orange-900/20"
    }
  ];

  return (
    <section className="space-y-6" aria-labelledby="trust-heading">
      <h2 id="trust-heading" className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-100 mb-2 text-left">
        Why Educators Trust Instaku
      </h2>
      <div className="w-16 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full mb-4" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {trustFactors.map((factor, index) => (
          <div key={index} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 text-center">
            <div className={`${factor.bgColor} p-2 rounded-lg w-fit mx-auto mb-2`}>
              <factor.icon className={`h-5 w-5 ${factor.color}`} />
            </div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-xs mb-1">{factor.title}</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">{factor.description}</p>
          </div>
        ))}
      </div>
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 text-center mt-4">
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-2 font-semibold">
                Our Promise to You
            </p>
            <div className="flex flex-wrap justify-center items-center gap-2 text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-2 px-2 py-1 bg-white/60 dark:bg-gray-900/40 rounded-full">
                <span className="w-2 h-2 rounded-full bg-green-400"></span>
                No ads
            </span>
            <span className="flex items-center gap-2 px-2 py-1 bg-white/60 dark:bg-gray-900/40 rounded-full">
                <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                Your questions stay private
            </span>
            <span className="flex items-center gap-2 px-2 py-1 bg-white/60 dark:bg-gray-900/40 rounded-full">
                <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                High-Quality Questions
            </span>
            </div>
        </div>
    </section>
  );
}