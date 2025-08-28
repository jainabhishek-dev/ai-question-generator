import { SparklesIcon, PencilSquareIcon, CheckCircleIcon } from "@heroicons/react/24/outline";

export default function UserJourney() {
  const steps = [
    {
      icon: SparklesIcon,
      title: "Describe Your Need",
      description: "Select subject, grade, and question type—or simply enter a topic.",
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      icon: PencilSquareIcon,
      title: "Instant AI Generation",
      description: "Our advanced AI creates high-quality, relevant questions in seconds.",
      gradient: "from-purple-500 to-pink-500"
    },
    {
      icon: CheckCircleIcon,
      title: "Review & Export",
      description: "Review and export selected questions as Worksheets or Answer Keys",
      gradient: "from-green-500 to-emerald-500"
    }
  ];

  return (
    <section className="space-y-6" aria-labelledby="journey-heading">
      <h2 id="journey-heading" className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-100 mb-2 text-left">
        How Instaku Works
      </h2>
      <div className="w-16 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full mb-4" />
      <div className="grid sm:grid-cols-3 gap-4">
        {steps.map((step, index) => (
          <div key={index} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 text-center">
            <div className={`bg-gradient-to-br ${step.gradient} p-2 rounded-lg w-fit mx-auto mb-2`}>
              <step.icon className="h-5 w-5 text-white" />
            </div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-xs mb-1">{step.title}</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">{step.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}