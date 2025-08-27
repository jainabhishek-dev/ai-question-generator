import Image from "next/image";

export default function LogoHeader() {
  return (
    <div className="flex flex-col items-center space-y-2">
      <Image
        src="/logo.png"
        alt="Instaku Logo"
        width={56}
        height={56}
        className="h-14 w-auto"
        priority
      />
      <h1 className="text-2xl sm:text-3xl font-bold text-center bg-gradient-to-r from-blue-800 via-purple-700 to-indigo-800 bg-clip-text text-transparent dark:from-blue-300 dark:via-purple-200 dark:to-indigo-200">
        About Instaku
      </h1>
    </div>
  );
}