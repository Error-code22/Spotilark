'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Upload, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';

interface EditProfileDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentUser: any;
    onProfileUpdated: () => void;
}

export function EditProfileDialog({ open, onOpenChange, currentUser, onProfileUpdated }: EditProfileDialogProps) {
    const { toast } = useToast();
    const supabase = createClient();

    const [username, setUsername] = useState(currentUser?.user_metadata?.username || '');
    const [bio, setBio] = useState(currentUser?.user_metadata?.bio || '');
    const [profilePicture, setProfilePicture] = useState<File | null>(null);
    const [profilePicturePreview, setProfilePicturePreview] = useState(currentUser?.user_metadata?.avatar_url || '');
    const [uploading, setUploading] = useState(false);

    const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                toast({
                    title: "File too large",
                    description: "Profile picture must be less than 5MB",
                    variant: "destructive"
                });
                return;
            }

            setProfilePicture(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfilePicturePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async () => {
        setUploading(true);

        try {
            let avatarUrl = currentUser?.user_metadata?.avatar_url;

            // Upload profile picture to Cloudinary if changed
            if (profilePicture) {
                const formData = new FormData();
                formData.append('file', profilePicture);
                formData.append('resource_type', 'image');

                const uploadResponse = await fetch('/api/upload-track', {
                    method: 'POST',
                    body: formData,
                });

                if (!uploadResponse.ok) {
                    throw new Error('Failed to upload profile picture');
                }

                const uploadData = await uploadResponse.json();
                avatarUrl = uploadData.data?.secure_url || uploadData.data?.url || uploadData.url;
            }

            // Update profile via server-side API for better cross-device reliability
            const response = await fetch('/api/profile/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: username.trim(),
                    bio: bio.trim(),
                    avatar_url: avatarUrl
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
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Edit Profile</DialogTitle>
                    <DialogDescription>
                        Update your profile information. Changes will be saved to your account.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    {/* Profile Picture */}
                    <div className="flex flex-col items-center gap-4">
                        <Avatar className="h-24 w-24">
                            <AvatarImage src={profilePicturePreview} alt="Profile" />
                            <AvatarFallback>{username.charAt(0) || 'U'}</AvatarFallback>
                        </Avatar>
                        <Label htmlFor="picture" className="cursor-pointer">
                            <div className="flex items-center gap-2 px-4 py-2 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground">
                                <Upload className="h-4 w-4" />
                                <span className="text-sm">Upload Picture</span>
                            </div>
                            <Input
                                id="picture"
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleProfilePictureChange}
                            />
                        </Label>
                        <p className="text-xs text-muted-foreground">Max size: 5MB</p>
                    </div>

                    {/* Email (Read-only) */}
                    <div className="grid gap-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            value={currentUser?.email || ''}
                            disabled
                            className="bg-muted cursor-not-allowed"
                        />
                        <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                    </div>

                    {/* Username */}
                    <div className="grid gap-2">
                        <Label htmlFor="username">Username</Label>
                        <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">@</span>
                            <Input
                                id="username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                                placeholder="username"
                                maxLength={20}
                            />
                        </div>
                        <p className="text-xs text-muted-foreground">Letters, numbers, and underscores only</p>
                    </div>

                    {/* Bio */}
                    <div className="grid gap-2">
                        <Label htmlFor="bio">Bio</Label>
                        <Textarea
                            id="bio"
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            placeholder="Tell us about yourself..."
                            maxLength={150}
                            rows={3}
                        />
                        <p className="text-xs text-muted-foreground text-right">{bio.length}/150</p>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={uploading}>
                        {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
