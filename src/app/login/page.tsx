'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { EyeIcon, EyeOffIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
      } else if (data.session) {
        router.push('/');
        router.refresh();
      }
    } catch (err: any) {
      setError('An unexpected error occurred during login.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className='flex items-center justify-center min-h-screen bg-background'>
      <div className='w-full max-w-sm border rounded-lg p-8 shadow-md bg-background'>
        <div className='text-center mb-8'>
          <h1 className='text-2xl font-bold'>Login</h1>
          <p className='text-muted-foreground mb-4'>
            Enter your email below to login to your account.
          </p>
          <div className='p-3 bg-primary/5 rounded-xl text-[11px] text-primary/70 border border-primary/10 flex items-center gap-3'>
            <div className='shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-sm'>!</div>
            <p className='text-left leading-tight'>
              <strong>One-Time Login:</strong> Internet is required to sign in, but once you&apos;re in, SpotiLark works fully offline for your cached music!
            </p>
          </div>
        </div>
        <form onSubmit={handleLogin}>
          <div className='grid gap-4 mb-4'>
            <div className='grid gap-2'>
              <Label htmlFor='email'>Email</Label>
              <Input
                id='email'
                name='email'
                type='email'
                placeholder='m@example.com'
                required
                className={error ? 'border-red-500' : ''}
              />
            </div>
            <div className='grid gap-2'>
              <div className='flex items-center'>
                <Label htmlFor='password'>Password</Label>
                <Link
                  href='/forgot-password'
                  className='ml-auto inline-block text-sm underline'
                >
                  Forgot your password?
                </Link>
              </div>
              <div className='relative'>
                <Input
                  id='password'
                  name='password'
                  type={showPassword ? 'text' : 'password'}
                  required
                  className='pr-10' // Add padding to the right for the icon
                />
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  className='absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent'
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? (
                    <EyeOffIcon className='h-4 w-4 text-muted-foreground' />
                  ) : (
                    <EyeIcon className='h-4 w-4 text-muted-foreground' />
                  )}
                </Button>
              </div>
            </div>
            {error && (
              <div className='text-sm text-red-500'>
                {error}
              </div>
            )}
          </div>
          <div className='flex flex-col gap-2'>
            <Button className='w-full bg-primary text-primary-foreground hover:bg-primary/90' type='submit' disabled={isSubmitting}>
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </Button>

            <Link href="/folders" className="w-full">
              <Button
                variant="outline"
                className="w-full border-primary/20 hover:bg-primary/5 text-primary/70"
                type="button"
              >
                Continue Offline
              </Button>
            </Link>

            <div className='mt-2 text-center text-sm'>
              Don&apos;t have an account?{" "}
              <Link href='/signup' className='underline'>
                Sign up
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}