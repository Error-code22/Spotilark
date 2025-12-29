'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { signInWithEmailAndPassword } from '@/lib/auth-actions';
import { EyeIcon, EyeOffIcon } from 'lucide-react';
import { useActionState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  
  // Define the initial state with proper type
  const initialState = {
    error: '',
    success: false,
  };
  
  const [state, formAction] = useActionState(signInWithEmailAndPassword, initialState);

  // Check if the login was successful and redirect if needed
  useEffect(() => {
    // Look for a success indicator in the state
    if (state?.success) {
      // Redirect to home page on successful login
      router.push('/');
      router.refresh(); // Refresh to ensure UI updates
    }
  }, [state, router]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle form submission to track loading state
  const handleSubmit = () => {
    setIsSubmitting(true);
  };

  // Reset loading state when state changes (form completes)
  useEffect(() => {
    if (state) {
      setIsSubmitting(false);
    }
  }, [state]);

  return (
    <div className='flex items-center justify-center min-h-screen bg-background'>
      <div className='w-full max-w-sm border rounded-lg p-8 shadow-md bg-background'>
        <div className='text-center mb-8'>
          <h1 className='text-2xl font-bold'>Login</h1>
          <p className='text-muted-foreground'>
            Enter your email below to login to your account.
          </p>
        </div>
        <form action={formAction} onSubmit={handleSubmit}>
          <div className='grid gap-4 mb-4'>
            <div className='grid gap-2'>
              <Label htmlFor='email'>Email</Label>
              <Input
                id='email'
                name='email'
                type='email'
                placeholder='m@example.com'
                required
                className={state?.error ? 'border-red-500' : ''}
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
            {state?.error && !state?.success && (
              <div className={`text-sm ${state.error.includes('confirmation') ? 'text-blue-500' : 'text-red-500'}`}>
                {state.error}
              </div>
            )}
          </div>
          <div className='flex flex-col'>
            <Button className='w-full bg-primary text-primary-foreground hover:bg-primary/90' type='submit' disabled={isSubmitting}>
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </Button>
            <div className='mt-4 text-center text-sm'>
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
