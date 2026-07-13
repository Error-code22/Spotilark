if (typeof window !== 'undefined') {
  const origConsoleError = console.error.bind(console);
  console.error = (...args: any[]) => {
    const msg = args.map(String).join(' ');
    if (msg.includes('Hydration') || msg.includes('hydrat') || msg.includes('jeep-sqlite') || msg.includes('recoverable') || msg.includes('mismatch')) return;
    origConsoleError(...args);
  };

  const origReportError = window.reportError?.bind(window);
  if (origReportError) {
    window.reportError = (err: any) => {
      const msg = String(err?.message || err || '');
      if (msg.includes('Hydration') || msg.includes('hydrat') || msg.includes('recoverable')) return;
      origReportError(err);
    };
  }

  window.addEventListener('error', (e) => {
    const msg = (e.message || '').toLowerCase();
    if (msg.includes('hydrat') || msg.includes('recoverable')) {
      e.stopImmediatePropagation();
      e.preventDefault();
      return false;
    }
  }, true);

  window.addEventListener('unhandledrejection', (e) => {
    const msg = String(e.reason?.message || e.reason || '').toLowerCase();
    if (msg.includes('hydrat') || msg.includes('recoverable')) {
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  }, true);
}
