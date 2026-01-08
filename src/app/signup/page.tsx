'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import Link from 'next/link';
import { signUpWithEmailAndPassword } from '@/lib/auth-actions';
import { EyeIcon, EyeOffIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [passwordMatchError, setPasswordMatchError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [state, setState] = useState<{ error: string | null; success: boolean }>({
    error: null,
    success: false,
  });
  const router = useRouter();

  const handlePasswordMatch = (password: string, confirmPassword: string) => {
    if (password !== confirmPassword) {
      setPasswordMatchError(true);
    } else {
      setPasswordMatchError(false);
    }
  };

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    // Check if passwords match
    if (password !== confirmPassword) {
      setPasswordMatchError(true);
      return;
    }

    // Check if terms are accepted
    if (!acceptTerms) {
      return;
    }

    setIsSubmitting(true);
    setState({ error: null, success: false });

    try {
      const result = await signUpWithEmailAndPassword(null, formData);
      setState(result as any);

      if (result.success) {
        router.push('/');
        router.refresh();
      }
    } catch (err: any) {
      setState({ error: 'An unexpected error occurred during sign up.', success: false });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className='flex items-center justify-center min-h-screen bg-background'>
      <div className='w-full max-w-sm border rounded-lg p-8 shadow-md bg-background'>
        <div className='text-center mb-8'>
          <h1 className='text-2xl font-bold'>Sign Up</h1>
          <p className='text-muted-foreground mb-4'>
            Enter your information to create an account.
          </p>
          <div className='p-3 bg-primary/5 rounded-xl text-[11px] text-primary/70 border border-primary/10 flex items-center gap-3'>
            <div className='shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-sm'>!</div>
            <p className='text-left leading-tight'>
              <strong>Quick Tip:</strong> You only need internet to create your account. After that, SpotiLark is built to play your music anywhere, even without a connection.
            </p>
          </div>
        </div>
        <form onSubmit={handleSignup}>
          <div className='grid gap-4 mb-4'>
            <div className='grid gap-2'>
              <Label htmlFor='email'>Email</Label>
              <Input
                id='email'
                name='email'
                type='email'
                placeholder='m@example.com'
                required
              />
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='password'>Password</Label>
              <div className='relative'>
                <Input
                  id='password'
                  name='password'
                  type={showPassword ? 'text' : 'password'}
                  required
                  className='pr-10'
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
            <div className='grid gap-2'>
              <Label htmlFor='confirm-password'>Confirm Password</Label>
              <div className='relative'>
                <Input
                  id='confirm-password'
                  name='confirmPassword'
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  className='pr-10'
                  onChange={(e) => {
                    const form = e.target.form;
                    if (form) {
                      const passwordInput = form.password as HTMLInputElement;
                      handlePasswordMatch(passwordInput.value, e.target.value);
                    }
                  }}
                />
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  className='absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent'
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                >
                  {showConfirmPassword ? (
                    <EyeOffIcon className='h-4 w-4 text-muted-foreground' />
                  ) : (
                    <EyeIcon className='h-4 w-4 text-muted-foreground' />
                  )}
                </Button>
              </div>
              {passwordMatchError && (
                <p className='text-red-500 text-sm mt-1'>Passwords do not match!</p>
              )}
            </div>
            <div className='flex items-center space-x-2'>
              <Checkbox
                id='terms'
                name='acceptTerms'
                checked={acceptTerms}
                onCheckedChange={(checked) => setAcceptTerms(checked as boolean)}
              />
              <Label htmlFor='terms'>
                Accept{" "}
                <Link href='/terms' className='underline'>
                  terms and conditions
                </Link>{" "}and{" "}
                <Link href='/privacy-policy' className='underline'>
                  privacy policy
                </Link>
              </Label>
            </div>
            {state?.error && (
              <div className={`text-sm ${state.error.includes('confirmation') ? 'text-blue-500' : 'text-red-500'}`}>
                {state.error}
              </div>
            )}
          </div>
          <div className='flex flex-col'>
            <Button className='w-full bg-primary text-primary-foreground hover:bg-primary/90' type='submit' disabled={isSubmitting || !acceptTerms}>
              {isSubmitting ? 'Creating account...' : 'Sign up'}
            </Button>
            <div className='mt-4 text-center text-sm'>
              Already have an account?{" "}
              <Link href='/login' className='underline'>
                Login
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}