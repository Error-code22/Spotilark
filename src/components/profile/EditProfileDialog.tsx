'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Dices } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface EditProfileDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentUser: any;
    onProfileUpdated: () => void;
}

// Generate DiceBear pixelated avatar URL
function getDiceBearAvatar(seed: string): string {
    return `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(seed)}`;
}

export function EditProfileDialog({ open, onOpenChange, currentUser, onProfileUpdated }: EditProfileDialogProps) {
    const { toast } = useToast();

    const [username, setUsername] = useState(currentUser?.user_metadata?.username || '');
    const [bio, setBio] = useState(currentUser?.user_metadata?.bio || '');
    // Initialize avatar seed from saved value or use user ID as default
    const [avatarSeed, setAvatarSeed] = useState(
        currentUser?.user_metadata?.avatar_seed || currentUser?.id || String(Date.now())
    );
    const [uploading, setUploading] = useState(false);

    // Roll limit system
    const INITIAL_ROLLS = 11;
    const REFRESH_ROLLS = 2;
    const REFRESH_DAYS = 7;

    // Initialize roll data from user metadata
    const initializeRolls = () => {
        const metadata = currentUser?.user_metadata;

        // If user has never used rolls, give them initial amount
        if (!metadata?.avatar_rolls_remaining && metadata?.avatar_rolls_remaining !== 0) {
            return INITIAL_ROLLS;
        }

        // Check if 7 days have passed since last refresh
        const lastRefresh = metadata?.avatar_last_refresh ? new Date(metadata.avatar_last_refresh) : null;
        const now = new Date();

        if (lastRefresh) {
            const daysSinceRefresh = (now.getTime() - lastRefresh.getTime()) / (1000 * 60 * 60 * 24);

            if (daysSinceRefresh >= REFRESH_DAYS) {
                // Grant 2 new rolls (max at INITIAL_ROLLS)
                const newRolls = Math.min(metadata.avatar_rolls_remaining + REFRESH_ROLLS, INITIAL_ROLLS);
                return newRolls;
            }
        }

        return metadata?.avatar_rolls_remaining || 0;
    };

    const [rollsRemaining, setRollsRemaining] = useState(initializeRolls());
    const [timeUntilRefresh, setTimeUntilRefresh] = useState('');

    // Live countdown timer
    useEffect(() => {
        const updateCountdown = () => {
            const lastRefresh = currentUser?.user_metadata?.avatar_last_refresh
                ? new Date(currentUser.user_metadata.avatar_last_refresh)
                : null;

            if (!lastRefresh) {
                setTimeUntilRefresh('');
                return;
            }

            const now = new Date();
            const nextRefresh = new Date(lastRefresh);
            nextRefresh.setDate(nextRefresh.getDate() + REFRESH_DAYS);

            const msRemaining = nextRefresh.getTime() - now.getTime();

            if (msRemaining <= 0) {
                setTimeUntilRefresh('Refresh available!');
                return;
            }

            const daysRemaining = Math.floor(msRemaining / (1000 * 60 * 60 * 24));
            const hoursRemaining = Math.floor((msRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

            if (daysRemaining > 0) {
                setTimeUntilRefresh(`Next refresh in: ${daysRemaining}d ${hoursRemaining}h`);
            } else {
                setTimeUntilRefresh(`Next refresh in: ${hoursRemaining}h`);
            }
        };

        updateCountdown();
        const interval = setInterval(updateCountdown, 60000); // Update every minute

        return () => clearInterval(interval);
    }, [currentUser, REFRESH_DAYS]);

    // Re-roll avatar - generate new random seed and decrement rolls
    const handleRerollAvatar = () => {
        if (rollsRemaining <= 0) {
            const lastRefresh = currentUser?.user_metadata?.avatar_last_refresh ? new Date(currentUser.user_metadata.avatar_last_refresh) : null;
            const daysUntilRefresh = lastRefresh
                ? Math.ceil(REFRESH_DAYS - (new Date().getTime() - lastRefresh.getTime()) / (1000 * 60 * 60 * 24))
                : 0;

            toast({
                title: "No rolls remaining",
                description: `You'll get 2 new rolls in ${daysUntilRefresh} day${daysUntilRefresh !== 1 ? 's' : ''}`,
                variant: "destructive"
            });
            return;
        }

        const newSeed = `${currentUser?.id || 'user'}-${Date.now()}`;
        setAvatarSeed(newSeed);
        setRollsRemaining((prev: number) => prev - 1);

        toast({
            title: "New avatar generated!",
            description: `${rollsRemaining - 1} roll${rollsRemaining - 1 !== 1 ? 's' : ''} remaining`
        });
    };

    const handleSave = async () => {
        if (!username.trim()) {
            toast({
                title: "Username required",
                description: "Please enter a username",
                variant: "destructive"
            });
            return;
        }

        setUploading(true);

        try {
            const now = new Date().toISOString();
            const shouldRefreshTimestamp = currentUser?.user_metadata?.avatar_rolls_remaining === undefined ||
                rollsRemaining > (currentUser?.user_metadata?.avatar_rolls_remaining || 0);

            // Update profile via server-side API - now includes avatar_seed and roll data
            const response = await fetch('/api/profile/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: username.trim(),
                    bio: bio.trim(),
                    avatar_seed: avatarSeed,
                    avatar_rolls_remaining: rollsRemaining,
                    avatar_last_refresh: shouldRefreshTimestamp ? now : (currentUser?.user_metadata?.avatar_last_refresh || now)
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update profile');
            }

            toast({
                title: "Profile updated",
                description: "Your profile has been updated successfully"
            });

            onProfileUpdated();
            onOpenChange(false);
        } catch (error: any) {
            console.error('Error updating profile:', error);
            toast({
                title: "Update failed",
                description: error.message || "Failed to update profile",
                variant: "destructive"
            });
        } finally {
            setUploading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit Profile</DialogTitle>
                    <DialogDescription>
                        Update your profile information
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {/* Avatar with Re-roll Button */}
                    <div className="flex flex-col items-center gap-4">
                        <Avatar className="w-24 h-24 border-2 border-primary">
                            <AvatarImage src={getDiceBearAvatar(avatarSeed)} alt="Profile" />
                            <AvatarFallback>{username?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col items-center gap-2">
                            <Button
                                onClick={handleRerollAvatar}
                                variant="outline"
                                size="sm"
                                className="gap-2"
                                disabled={rollsRemaining <= 0}
                            >
                                <Dices className="h-4 w-4" />
                                New Avatar
                            </Button>
                            <p className="text-xs font-medium">
                                {rollsRemaining} roll{rollsRemaining !== 1 ? 's' : ''} remaining
                            </p>
                            <p className="text-xs text-muted-foreground text-center max-w-[200px]">
                                {rollsRemaining > 0
                                    ? "Click to generate a new random avatar"
                                    : (timeUntilRefresh || "Rolls refresh every 7 days (+2 rolls)")}
                            </p>
                        </div>
                    </div>

                    {/* Username */}
                    <div className="grid gap-2">
                        <Label htmlFor="username">Username</Label>
                        <Input
                            id="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter your username"
                        />
                    </div>

                    {/* Bio */}
                    <div className="grid gap-2">
                        <Label htmlFor="bio">Bio</Label>
                        <Textarea
                            id="bio"
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            placeholder="Tell us about yourself..."
                            rows={3}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button onClick={handleSave} disabled={uploading}>
                        {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
