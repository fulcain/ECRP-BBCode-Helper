import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-[#07070b] px-6">
      {/* Gradient accent line at top */}
      <div className="fixed top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-500/50 animate-gradient" />

      <div className="flex flex-col items-center text-center max-w-md animate-slide-up">
        {/* Large 404 */}
        <div className="relative mb-6">
          <span className="text-[120px] font-bold leading-none bg-gradient-to-b from-white/10 to-transparent bg-clip-text text-transparent select-none">
            404
          </span>
          {/* Decorative glow */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="h-40 w-40 rounded-full bg-violet-500/10 blur-3xl" />
          </div>
        </div>

        {/* Icon */}
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/10 border border-white/[0.06]">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-zinc-500"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        {/* Heading */}
        <h1 className="text-xl font-semibold text-white/80 mb-2">
          Page not found
        </h1>

        {/* Description */}
        <p className="text-sm text-zinc-500 leading-relaxed mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        {/* Home button */}
        <Link
          href="/"
          className="
            inline-flex items-center gap-2
            rounded-xl border border-white/[0.06] bg-zinc-800/40
            px-5 py-2.5 text-sm font-medium text-zinc-300
            transition-all duration-200
            hover:border-violet-500/25 hover:bg-violet-500/10 hover:text-violet-300
            hover:shadow-lg hover:shadow-violet-500/5
            active:scale-[0.97]
          "
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          Back to Home
        </Link>
      </div>

      {/* Footer */}
      <div className="fixed bottom-6 text-center">
        <span className="text-[10px] text-zinc-700 font-mono">
          BBCode Helper · ECRP
        </span>
      </div>
    </div>
  );
}
