import Image from "next/image";

export default function LogoHeader() {
  return (
    <div className="flex flex-col items-center space-y-2">
      <Image
        src="/logo.png"
        alt="Instaku Logo - AI Educational Question Generator"
        width={48}
        height={48}
        className="h-12 w-auto"
        priority
      />
      <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent dark:from-gray-100 dark:via-blue-400 dark:to-purple-400 text-center">
        Instaku
      </h1>
      <div className="flex items-center justify-center gap-2 mt-1 text-xs">
        <span className="px-2 py-1 bg-white/20 rounded-full">Create</span>
        <span className="px-2 py-1 bg-white/20 rounded-full">AI-Powered</span>
        <span className="px-2 py-1 bg-white/20 rounded-full">Free</span>
      </div>
    </div>
  );
}