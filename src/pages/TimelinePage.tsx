const TimelinePage = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-8">
      <h1 className="font-headline text-5xl text-foreground mb-4 text-center uppercase tracking-tight leading-none">
        The<br />Deadline
      </h1>

      <div className="tape-note mt-2">
        <span className="font-handwritten text-sm text-secondary-foreground">
          coming soon
        </span>
      </div>

      <div className="wobbly-border mt-12 px-6 py-4 max-w-[300px]">
        <p className="font-handwritten text-center text-muted-foreground text-lg">
          your timeline will appear here — every milestone, every moment.
        </p>
      </div>
    </div>
  );
};

export default TimelinePage;
