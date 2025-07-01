export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <header className="row-start-1 flex gap-[24px] flex-wrap items-center justify-center">
      </header>
      <main className="row-start-2 flex flex-col gap-10 items-center justify-center">
        <div className="flex flex-col gap-4 items-center justify-center">
          <h1>Mon Cercle Santé</h1>
          </div>
        </main>
      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
      </footer>
    </div>
  );
}
