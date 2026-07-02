const copy = {
  title: "Explorar",
  subtitle: "Atribuição e investigação por time, pessoa e modelo",
  emptyTitle: "Sem dados para explorar ainda",
  emptyBody:
    "Assim que uma fonte estiver conectada, você poderá investigar o gasto por time, pessoa e modelo — incluindo o que não puder ser atribuído.",
};

export default function ExplorePage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{copy.title}</h1>
        <p className="text-sm text-muted-foreground">{copy.subtitle}</p>
      </div>
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed bg-card p-12 text-center">
        <p className="font-medium">{copy.emptyTitle}</p>
        <p className="max-w-md text-sm text-muted-foreground">{copy.emptyBody}</p>
      </div>
    </div>
  );
}
