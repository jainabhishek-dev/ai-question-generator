export default function TechStack() {
  const technologies = [
    { name: "Next.js", category: "Frontend Framework", color: "bg-black text-white" },
    { name: "Supabase", category: "Database & Auth", color: "bg-green-600 text-white" },
    { name: "Gemini", category: "AI Engine", color: "bg-gray-800 text-white" },
    { name: "Tailwind CSS", category: "Styling", color: "bg-cyan-500 text-white" },
    { name: "TypeScript", category: "Language", color: "bg-blue-600 text-white" },
    { name: "Vercel", category: "Deployment", color: "bg-black text-white" }
  ];

  return (
    <section className="space-y-6" aria-labelledby="tech-heading">
      <h2 id="tech-heading" className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-100 mb-2 text-left">
        Built with Modern Technology
      </h2>
      <div className="w-16 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full mb-4" />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {technologies.map((tech, index) => (
          <div key={index} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 text-center">
            <div className={`${tech.color} px-3 py-1 rounded-lg font-semibold text-xs mb-2 inline-block`}>
              {tech.name}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{tech.category}</p>
          </div>
        ))}
      </div>
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 text-center border border-blue-100 dark:border-blue-800/30 mt-4">
        <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
          <span className="font-semibold text-gray-800 dark:text-gray-200">Performance-first architecture:</span> Lightning-fast loading times, real-time AI processing, and 99.9% uptime reliability. Every component is optimized for the best user experience.
        </p>
      </div>
    </section>
  );
}