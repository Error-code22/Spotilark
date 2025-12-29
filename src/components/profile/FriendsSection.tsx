'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Copy, UserPlus, Users, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function FriendsSection() {
    const { toast } = useToast();
    const [friendCode, setFriendCode] = useState('');
    const [inputCode, setInputCode] = useState('');
    const [friends, setFriends] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);

    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchFriendCode();
        fetchFriends();
    }, []);

    const fetchFriendCode = async () => {
        try {
            setError(null);
            const response = await fetch('/api/friends/code');
            const data = await response.json();

            if (response.ok) {
                setFriendCode(data.friend_code);
            } else {
                setError(data.message || data.error || 'Failed to load');
            }
        } catch (err: any) {
            console.error('Error fetching friend code:', err);
            setError('Network error');
        }
    };

    const fetchFriends = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/friends/list');
            if (response.ok) {
                const data = await response.json();
                setFriends(data.friends || []);
            }
        } catch (error) {
            console.error('Error fetching friends:', error);
        } finally {
            setLoading(false);
        }
    };

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
            const response = await fetch('/api/friends/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ friend_code: inputCode.toUpperCase() })
            });

            const data = await response.json();

            if (response.ok) {
                toast({
                    title: "Friend request sent!",
                    description: `Request sent to @${data.friend.username}`
                });
                setInputCode('');
                fetchFriends();
            } else {
                toast({
                    title: "Failed to add friend",
                    description: data.error,
                    variant: "destructive"
                });
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to send friend request",
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
