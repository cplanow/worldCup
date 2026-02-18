import { UsernameForm } from "@/components/UsernameForm";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <main className="flex w-full max-w-sm flex-col items-center gap-8 px-6">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">
          worldCup
        </h1>
        <UsernameForm />
      </main>
    </div>
  );
}
