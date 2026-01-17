import { SparklesIcon, PuzzlePieceIcon, FolderIcon, ChartBarIcon, ArrowDownTrayIcon, ShareIcon } from '@heroicons/react/24/outline';

export default function Features() {
  const features = [
    {
      title: "Create Questions",
      description: "Generate AI-powered questions from PDFs, topics, or NCERT content with customizable difficulty and question types.",
      icon: SparklesIcon,
      gradient: "from-blue-500 to-cyan-500",
      subFeatures: [
        { name: "My Questions", icon: FolderIcon, description: "Save and organize up to 40 questions in your personal library" },
        { name: "CSV Export", icon: ArrowDownTrayIcon, description: "Export selected questions as CSV files for offline use" }
      ]
    },
    {
      title: "Create Quiz Games",
      description: "Turn your questions into interactive quiz games with shareable links that work on any device.",
      icon: PuzzlePieceIcon,
      gradient: "from-purple-500 to-pink-500",
      subFeatures: [
        { name: "My Games", icon: FolderIcon, description: "Manage your quiz games and view detailed performance analytics" },
        { name: "Shareable Links", icon: ShareIcon, description: "Generate unique quiz links that anyone can play without an account" },
        { name: "Analytics Dashboard", icon: ChartBarIcon, description: "Track plays, scores, leaderboards, and question-level insights" }
      ]
    }
  ];

  return (
    <section className="space-y-6" aria-labelledby="features-heading">
      <h2 id="features-heading" className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-100 mb-2 text-left">
        Core Features
      </h2>
      <div className="w-16 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full mb-4" />
      
      <div className="grid md:grid-cols-2 gap-6">
        {features.map((feature, index) => (
          <div 
            key={index} 
            className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700"
          >
            {/* Feature Header */}
            <div className="flex items-start gap-4 mb-4">
              <div className={`bg-gradient-to-br ${feature.gradient} p-3 rounded-lg`}>
                <feature.icon className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-800 dark:text-gray-100 text-lg mb-1">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {feature.description}
                </p>
              </div>
            </div>

            {/* Sub-features */}
            <div className="space-y-3 pl-2">
              {feature.subFeatures.map((sub, subIndex) => (
                <div key={subIndex} className="flex items-start gap-3">
                  <sub.icon className="h-5 w-5 text-gray-400 dark:text-gray-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-gray-700 dark:text-gray-200 text-sm">
                      {sub.name}
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {sub.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
