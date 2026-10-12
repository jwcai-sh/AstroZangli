import Link from "next/link";

export default function LanguageSelectionPage(): React.JSX.Element {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050608] px-5 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(52,77,121,0.34),transparent_48%)]" />
      <section className="relative z-10 w-full max-w-xl rounded-3xl border border-white/15 bg-white/[0.06] p-8 text-center shadow-2xl backdrop-blur-xl sm:p-12">
        <p className="text-sm tracking-[0.35em] text-blue-200">ASTRO ZANGLI</p>
        <h1 className="mt-5 text-3xl font-semibold sm:text-4xl">选择语言 / སྐད་ཡིག་འདེམས།</h1>
        <p className="mt-3 text-sm text-slate-300">进入藏历星图</p>
        <div className="mt-9 grid gap-4 sm:grid-cols-2">
          <Link href="/zh" className="rounded-2xl border border-blue-200/30 bg-blue-500/15 px-6 py-5 text-lg font-medium transition hover:bg-blue-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200">
            中文
          </Link>
          <Link href="/bo" lang="bo" className="rounded-2xl border border-amber-200/30 bg-amber-300/10 px-6 py-5 text-lg font-medium transition hover:bg-amber-300/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200">
            བོད་ཡིག
          </Link>
        </div>
      </section>
    </main>
  );
}
