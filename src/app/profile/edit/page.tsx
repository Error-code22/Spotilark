
'use client';

import { SpotilarkLayout } from "@/components/spotilark-layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { User as SupabaseUser } from '@supabase/supabase-js';

export default function EditProfilePage() {
  const router = useRouter();
  const supabase = createClient();

  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        setUserName(user.user_metadata.name || '');
        setUserEmail(user.email || '');
      } else {
        router.push('/login'); // Redirect if no user session
      }
      setLoadingUser(false);
    };
    fetchUser();
  }, [supabase, router]);

  const handleSaveChanges = async () => {
    if (!user) return;

    // Update name and email
    const { error: updateError } = await supabase.auth.updateUser({
      email: userEmail,
      data: { name: userName },
    });

    if (updateError) {
      console.error('Error updating user profile:', updateError.message);
      alert('Error updating profile!');
    } else {
      alert('Profile updated successfully!');
      router.refresh();
    }
  };

  if (loadingUser) {
    return (
      <SpotilarkLayout>
        <div className="flex-1 p-8 overflow-y-auto pb-24">
          <h1 className="text-4xl font-bold mb-8">Loading Profile...</h1>
        </div>
      </SpotilarkLayout>
    );
  }

  return (
    <SpotilarkLayout>
      <div className="flex-1 p-8 overflow-y-auto pb-24">
        <h1 className="text-4xl font-bold mb-8">Edit Profile</h1>
        
        <div className="max-w-2xl mx-auto">
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Profile Information</h2>
            <p className="text-muted-foreground">Update your account's profile information and email address.</p>

            <div className="flex items-center gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src={user?.user_metadata.avatar_url || '/placeholder-avatar.png'} alt={userName || 'User'} />
                <AvatarFallback>{userName ? userName.substring(0, 2).toUpperCase() : 'U'}</AvatarFallback>
              </Avatar>
              <Button variant="ghost">Change Photo</Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={userName} onChange={(e) => setUserName(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} />
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <Link href="/profile">
                  <Button variant="ghost">Cancel</Button>
              </Link>
              <Button onClick={handleSaveChanges}>Save Changes</Button>
            </div>
          </div>
        </div>
      </div>
    </SpotilarkLayout>
  );
}
