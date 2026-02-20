import Link from "next/link";

export default function Home() {
  return (
    <section className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white space-y-12 p-6 overflow-hidden relative">
      {/* Animated background orbs */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute top-40 right-10 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>

      <div className="relative z-10 space-y-6">
        <div className="space-y-4 max-w-2xl">
          <h1 className="text-6xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 leading-tight">
            Hypothesis
          </h1>
          <p className="text-xl text-gray-300 leading-relaxed font-light">
            Publish bold hypotheses. Collaborate with peers. Build scientific consensus through rigorous reproducibility.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-3 pt-4">
          <Link
            href="/hypos"
            className="group relative overflow-hidden rounded-2xl p-6 backdrop-blur-md bg-white/10 border border-white/20 hover:bg-white/20 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/20"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/0 to-blue-600/0 group-hover:from-blue-600/20 group-hover:to-blue-600/10 transition duration-300"></div>
            <div className="relative z-10">
              <div className="text-3xl mb-2">🔍</div>
              <div className="text-sm font-medium text-gray-300 group-hover:text-gray-100">Browse</div>
              <div className="mt-2 font-bold text-lg text-white group-hover:text-blue-300 transition">All Hypotheses</div>
              <p className="text-xs text-gray-400 mt-2">Explore what's being tested</p>
            </div>
          </Link>

          <Link
            href="/new"
            className="group relative overflow-hidden rounded-2xl p-6 backdrop-blur-md bg-white/10 border border-white/20 hover:bg-white/20 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/20"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600/0 to-purple-600/0 group-hover:from-purple-600/20 group-hover:to-purple-600/10 transition duration-300"></div>
            <div className="relative z-10">
              <div className="text-3xl mb-2">✨</div>
              <div className="text-sm font-medium text-gray-300 group-hover:text-gray-100">Create</div>
              <div className="mt-2 font-bold text-lg text-white group-hover:text-purple-300 transition">Post a Hypothesis</div>
              <p className="text-xs text-gray-400 mt-2">Share your research idea</p>
            </div>
          </Link>

          <Link
            href="/profile"
            className="group relative overflow-hidden rounded-2xl p-6 backdrop-blur-md bg-white/10 border border-white/20 hover:bg-white/20 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-pink-500/20"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-pink-600/0 to-pink-600/0 group-hover:from-pink-600/20 group-hover:to-pink-600/10 transition duration-300"></div>
            <div className="relative z-10">
              <div className="text-3xl mb-2">🏆</div>
              <div className="text-sm font-medium text-gray-300 group-hover:text-gray-100">Track</div>
              <div className="mt-2 font-bold text-lg text-white group-hover:text-pink-300 transition">Your Badges</div>
              <p className="text-xs text-gray-400 mt-2">View your achievements</p>
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}
