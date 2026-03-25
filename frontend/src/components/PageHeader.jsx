function PageHeader({ title, subtitle, right }) {
  return (
    <div className="flex flex-col md:flex-row md:items-end gap-3 justify-between mb-6">
      <div>
        <h2 className="text-2xl font-bold">{title}</h2>
        {subtitle ? (
          <p className="mt-1 text-sm text-[var(--text-muted)]">{subtitle}</p>
        ) : null}
      </div>
      {right ? <div className="flex items-center gap-2">{right}</div> : null}
    </div>
  );
}

export default PageHeader;
