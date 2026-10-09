import Link from 'next/link';

export default function ShareNotFound() {
  return (
    <div className='dark flex min-h-screen flex-col items-center justify-center bg-background p-4 text-foreground'>
      <div className='w-full max-w-md rounded-2xl border bg-card p-8 text-center shadow-2xl'>
        <h1 className='text-xl font-bold'>Share not found</h1>
        <p className='mt-2 text-sm text-muted-foreground'>
          This share link is invalid or has expired.
        </p>
        <Link
          href='/'
          className='mt-6 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90'
        >
          Open Spotilark
        </Link>
      </div>
    </div>
  );
}
