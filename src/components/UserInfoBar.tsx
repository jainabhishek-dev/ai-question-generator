import Link from "next/link"

interface UserInfoBarProps {
  userQuestions: number
}

const UserInfoBar = ({ userQuestions }: UserInfoBarProps) => (
  <div className="mb-4 text-center text-sm text-gray-700 dark:text-gray-200">
    You have <span className="font-bold">{userQuestions}</span> question{userQuestions !== 1 ? "s" : ""} in your{" "}
    <Link href="/my-questions" className="text-blue-600 underline hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
      library
    </Link>.
    {userQuestions >= 40 && (
      <span className="ml-2 text-red-600 font-semibold dark:text-red-400">You have reached your free limit.</span>
    )}
  </div>
)

export default UserInfoBar