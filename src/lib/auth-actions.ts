'use server'

import { createClient } from './supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

// Helper function to generate DiceBear avatar URL
function generateDiceBearAvatarUrl(seed: string): string {
  const styles = ['bottts', 'pixel-art', 'identicon', 'micah', 'shapes', 'icons'];
  const randomStyle = styles[Math.floor(Math.random() * styles.length)];
  return `https://api.dicebear.com/7.x/${randomStyle}/svg?seed=${encodeURIComponent(seed)}`;
}

export async function signInWithEmailAndPassword(prevState: any, formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const supabase = await createClient()

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    console.log('Sign in response:', { data, error }) // Debug logging

    if (error) {
      console.error('Sign in error:', error)
      return { error: error.message || 'Sign in failed' }
    }

    // If sign in is successful, return a success indicator instead of redirecting here
    // The redirect will be handled on the client side
    return { success: true, error: null }
  } catch (error: any) {
    console.error('Sign in exception:', error?.message || error)
    return { error: error?.message || 'An unexpected error occurred during sign in', success: false }
  }
}

export async function signUpWithEmailAndPassword(prevState: any, formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const supabase = await createClient()

  try {
    const avatarUrl = generateDiceBearAvatarUrl(email);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          avatar_url: avatarUrl,
          name: email.split('@')[0], // Default name from email
        },
      },
    })

    console.log('Sign up response:', { data, error }) // Debug logging

    if (error) {
      console.error('Sign up error:', error)
      return { error: error.message || 'Sign up failed', success: false }
    }

    // If sign up is successful, return a success indicator
    // If they can log in immediately, return success
    // If they need to confirm email, return appropriate message
    if (data.session) {
      // If a session is created, they can be considered logged in
      return { success: true, error: null }
    } else {
      // If no session but no error, let user know they need to sign in separately
      return { error: 'Account created! Please sign in with your credentials.', success: false }
    }
  } catch (error: any) {
    console.error('Sign up exception:', error?.message || error)
    return { error: error?.message || 'An unexpected error occurred during sign up', success: false }
  }
}

export async function signOut(formData: FormData) {
  const supabase = await createClient()

  try {
    await supabase.auth.signOut()
    
    // For server-side action, return success instead of redirecting here
    // Redirect will happen on client side
    return { success: true, error: null }
  } catch (error) {
    console.error('Sign out error:', error)
    return { success: false, error: 'Sign out failed' }
  }
}