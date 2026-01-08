'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Copy, UserPlus, Users, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';
import { generateFriendCode } from '@/lib/friend-code';

export function FriendsSection() {
    const { toast } = useToast();
    const [friendCode, setFriendCode] = useState('');
    const [inputCode, setInputCode] = useState('');
    const [friends, setFriends] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);

    const [error, setError] = useState<string | null>(null);
    const supabase = createClient();

    const fetchFriendCode = useCallback(async () => {
        try {
            setError(null);

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Get user's friend code
            const { data: profile } = await supabase
                .from('user_profiles')
                .select('friend_code')
                .eq('id', user.id)
                .maybeSingle();

            if (profile?.friend_code) {
                setFriendCode(profile.friend_code);
            } else {
                // Generate if strictly needed, or handle as "Not generated"
                // For client-side safety, we could try to generate and upsert, 
                // but usually this is better done server-side. 
                // We'll try one optimistic generation.
                const newCode = generateFriendCode();
                const username = user.user_metadata?.username || user.email?.split('@')[0] || 'user';

                const { error: upsertError } = await supabase
                    .from('user_profiles')
                    .upsert({
                        id: user.id,
                        username: username,
                        friend_code: newCode,
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'id' });

                if (!upsertError) {
                    setFriendCode(newCode);
                } else {
                    console.error('Failed to generate/save friend code', upsertError);
                    setError('Could not generate code');
                }
            }
        } catch (err: any) {
            console.error('Error fetching friend code:', err);
            setError('Network error');
        }
    }, [supabase]);

    const fetchFriends = useCallback(async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: friendsData, error: friendsError } = await supabase
                .from('friends')
                .select(`
                id,
                status,
                created_at,
                friend:user_profiles!friends_friend_id_fkey(id, username, profile_picture_url)
              `)
                .eq('user_id', user.id)
                .eq('status', 'accepted');

            if (friendsError) {
                console.error('Error fetching friends:', friendsError);
                // toast({ title: "Error", description: "Could not load friends", variant: "destructive" });
            } else {
                setFriends(friendsData || []);
            }

        } catch (error) {
            console.error('Error fetching friends:', error);
        } finally {
            setLoading(false);
        }
    }, [supabase]);

    useEffect(() => {
        fetchFriendCode();
        fetchFriends();
    }, [fetchFriendCode, fetchFriends]);

    const copyFriendCode = () => {
        navigator.clipboard.writeText(friendCode);
        toast({
            title: "Copied!",
            description: "Friend code copied to clipboard"
        });
    };

    const addFriend = async () => {
        if (!inputCode.trim()) return;

        setAdding(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                toast({ title: "Error", description: "You must be logged in", variant: "destructive" });
                return;
            }

            const codeToAdd = inputCode.toUpperCase();

            // 1. Find user by code
            const { data: friendProfile, error: findError } = await supabase
                .from('user_profiles')
                .select('id, username')
                .eq('friend_code', codeToAdd)
                .single();

            if (findError || !friendProfile) {
                toast({ title: "Error", description: "Friend code not found", variant: "destructive" });
                setAdding(false);
                return;
            }

            if (friendProfile.id === user.id) {
                toast({ title: "Error", description: "Cannot add yourself", variant: "destructive" });
                setAdding(false);
                return;
            }

            // 2. Check existing
            const { data: existing } = await supabase
                .from('friends')
                .select('*')
                .or(`and(user_id.eq.${user.id},friend_id.eq.${friendProfile.id}),and(user_id.eq.${friendProfile.id},friend_id.eq.${user.id})`)
                .maybeSingle();

            if (existing) {
                toast({
                    title: "Info",
                    description: existing.status === 'accepted' ? 'Already friends' : 'Request already sent',
                    variant: "default"
                });
                setAdding(false);
                return;
            }

            // 3. Insert
            const { error: insertError } = await supabase
                .from('friends')
                .insert({
                    user_id: user.id,
                    friend_id: friendProfile.id,
                    status: 'pending'
                });

            if (insertError) throw insertError;

            toast({
                title: "Friend request sent!",
                description: `Request sent to @${friendProfile.username}`
            });
            setInputCode('');
            // fetchFriends(); // Only shows accepted, so no change visible immediately usually
        } catch (error: any) {
            toast({
                title: "Error",
                description: "Failed to send friend request: " + error.message,
                variant: "destructive"
            });
        } finally {
            setAdding(false);
        }
    };

    const handleIconClick = () => {
        if (error) {
            fetchFriendCode();
        } else if (friendCode) {
            copyFriendCode();
        }
    };

    return (
        <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
            {/* Friend Code */}
            <div className='p-4 rounded-lg border'>
                <h3 className='text-lg font-bold mb-2 flex items-center gap-2'>
                    <Users className='h-5 w-5' />
                    Your Friend Code
                </h3>
                <div className='flex items-center gap-2'>
                    <code className={`flex-1 px-3 py-2 rounded-md bg-muted font-mono text-sm tracking-tight ${error ? 'text-red-500' : 'text-lg tracking-wider'}`}>
                        {error || (friendCode || 'Loading...')}
                    </code>
                    <Button
                        variant='ghost'
                        size='icon'
                        onClick={handleIconClick}
                        className={error ? 'text-red-500' : ''}
                        disabled={!error && !friendCode}
                    >
                        {error ? <Loader2 className='h-4 w-4' /> : <Copy className='h-4 w-4' />}
                    </Button>
                </div>
                <p className='text-xs text-muted-foreground mt-2'>
                    Share this code with friends to connect
                </p>
            </div>

            {/* Add Friend */}
            <div className='p-4 rounded-lg border'>
                <h3 className='text-lg font-bold mb-2 flex items-center gap-2'>
                    <UserPlus className='h-5 w-5' />
                    Add Friend
                </h3>
                <div className='flex items-center gap-2'>
                    <Input
                        placeholder='XXXX-XXXX'
                        value={inputCode}
                        onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                        maxLength={9}
                        className='font-mono'
                    />
                    <Button
                        onClick={addFriend}
                        disabled={adding || inputCode.length < 9}
                    >
                        {adding ? <Loader2 className='h-4 w-4 animate-spin' /> : 'Add'}
                    </Button>
                </div>
                <p className='text-xs text-muted-foreground mt-2'>
                    Enter a friend's code to send a request
                </p>
            </div>

            {/* Friends List */}
            <div className='md:col-span-2 lg:col-span-3 p-4 rounded-lg border'>
                <h3 className='text-lg font-bold mb-3'>Friends ({friends.length})</h3>
                {loading ? (
                    <p className='text-muted-foreground'>Loading friends...</p>
                ) : friends.length === 0 ? (
                    <p className='text-muted-foreground'>No friends yet. Add some using their friend code!</p>
                ) : (
                    <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3'>
                        {friends.map((friend: any) => (
                            <div key={friend.id} className='flex items-center gap-2 p-2 rounded-md border'>
                                <Avatar className='h-10 w-10'>
                                    <AvatarImage src={friend.friend?.profile_picture_url} />
                                    <AvatarFallback>{friend.friend?.username?.charAt(0) || 'F'}</AvatarFallback>
                                </Avatar>
                                <div className='flex-1 min-w-0'>
                                    <p className='text-sm font-medium truncate'>@{friend.friend?.username || 'User'}</p>
                                    <p className='text-xs text-muted-foreground'>Friend</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
