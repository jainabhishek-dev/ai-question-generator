import { SparklesIcon, PencilSquareIcon, CheckCircleIcon } from "@heroicons/react/24/outline";

export default function UserJourney() {
  const steps = [
    {
      icon: SparklesIcon,
      title: "Create Questions",
      description: "Generate high-quality questions using AI from PDFs, topics, or NCERT content.",
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      icon: PencilSquareIcon,
      title: "Organize & Manage",
      description: "Save, filter, and export questions as CSV files in your personal library.",
      gradient: "from-purple-500 to-pink-500"
    },
    {
      icon: CheckCircleIcon,
      title: "Create Quiz Games",
      description: "Turn your questions into interactive quiz games with shareable links.",
      gradient: "from-green-500 to-emerald-500"
    },
    {
      icon: SparklesIcon,
      title: "Share & Track",
      description: "Share quiz links and monitor player performance with detailed analytics.",
      gradient: "from-orange-500 to-red-500"
    }
  ];

  return (
    <section className="space-y-6" aria-labelledby="journey-heading">
      <h2 id="journey-heading" className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-100 mb-2 text-left">
        How Instaku Works
      </h2>
      <div className="w-16 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full mb-4" />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
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