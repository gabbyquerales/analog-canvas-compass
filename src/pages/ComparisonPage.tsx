const ComparisonPage = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-8">
      <h1 className="font-headline text-4xl text-foreground mb-1 text-center uppercase tracking-tight leading-none">
        LA vs.
      </h1>
      <h1 className="font-headline text-4xl text-foreground mb-4 text-center uppercase tracking-tight leading-none">
        The World
      </h1>

      <div className="tape-note mt-2">
        <span className="font-handwritten text-sm text-secondary-foreground">
          compare anything
        </span>
      </div>

      <div className="wobbly-border mt-12 px-6 py-4 max-w-[300px]">
        <p className="font-handwritten text-center text-muted-foreground text-lg">
          side-by-side comparisons will live here — stay tuned.
        </p>
      </div>
    </div>
  );
};

export default ComparisonPage;
