'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { SpotilarkLayout } from '@/components/spotilark-layout';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart, ListMusic, Music, UserPlus, Share2 } from 'lucide-react';
import { useUser } from '@/hooks/useUser';

export default function ProfileClient() {
    const { username } = useParams();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { user: authUser } = useUser();
    const supabase = createClient();
    const router = useRouter();

    useEffect(() => {
        const fetchPublicProfile = async () => {
            try {
                const decodedUsername = decodeURIComponent(username as string).replace(/^@/, '');

                // Search by username
                const { data, error } = await supabase
                    .from('user_profiles')
                    .select('*')
                    .eq('username', decodedUsername)
                    .single();

                if (error) {
                    // If not found by username, try by ID (for fallback)
                    const { data: idData, error: idError } = await supabase
                        .from('user_profiles')
                        .select('*')
                        .eq('id', decodedUsername)
                        .single();

                    if (idError) throw new Error('Profile not found');
                    setProfile(idData);
                } else {
                    setProfile(data);
                }
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        if (username) fetchPublicProfile();
    }, [username, supabase]);

    const handleAddFriend = async () => {
        if (!authUser) {
            router.push('/login');
            return;
        }

        try {
            const res = await fetch('/api/friends/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ friendCode: profile?.friend_code })
            });

            const data = await res.json();
            if (res.ok) {
                alert('Friend request sent!');
            } else {
                alert(data.error || 'Failed to add friend');
            }
        } catch (e) {
            alert('Error sending request');
        }
    };

    if (loading) return <SpotilarkLayout><div className="p-8">Loading profile...</div></SpotilarkLayout>;
    if (error || !profile) return <SpotilarkLayout><div className="p-8 text-red-500">Error: {error || 'Profile not found'}</div></SpotilarkLayout>;

    return (
        <SpotilarkLayout>
            <div className="flex-1 p-8 overflow-y-auto pb-24">
                <div className="p-6 flex flex-col md:flex-row items-center gap-6">
                    <Avatar className="h-40 w-40 border-4 border-primary/20">
                        <AvatarImage src={profile.profile_picture_url} />
                        <AvatarFallback>{profile.username.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-center md:text-left">
                        <h1 className="text-4xl font-bold">@{profile.username}</h1>
                        {profile.bio && <p className="text-muted-foreground mt-4 text-lg max-w-2xl">{profile.bio}</p>}

                        <div className="flex flex-wrap gap-4 mt-8 justify-center md:justify-start">
                            {authUser?.id !== profile.id && (
                                <Button className="rounded-full px-8" onClick={handleAddFriend}>
                                    <UserPlus className="mr-2 h-5 w-5" /> Add Friend
                                </Button>
                            )}
                            <Button variant="outline" className="rounded-full px-8" onClick={() => {
                                navigator.clipboard.writeText(window.location.href);
                                alert('Profile link copied!');
                            }}>
                                <Share2 className="mr-2 h-5 w-5" /> Share
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="grid gap-8 md:grid-cols-2 mt-12">
                    <Card className="bg-primary/5 border-primary/10">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <ListMusic className="h-5 w-5 text-primary" />
                                Public Playlists
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground italic">No public playlists available yet.</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-primary/5 border-primary/10">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Music className="h-5 w-5 text-primary" />
                                Vibe Check
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap gap-2">
                                <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm">Active Listener</span>
                                <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm">Early Adopter</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </SpotilarkLayout>
    );
}
