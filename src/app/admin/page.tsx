'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@/hooks/useUser';
import { SpotilarkLayout } from '@/components/spotilark-layout';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Music, Database, Shield, ChevronRight, Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function AdminDashboard() {
    const { user, isAdmin, isLoading: userLoading } = useUser();
    const [stats, setStats] = useState({ users: 0, tracks: 0, storage: '0 MB' });
    const [profiles, setProfiles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        if (!userLoading && !isAdmin) {
            router.push('/');
        }
    }, [isAdmin, userLoading, router]);

    useEffect(() => {
        const fetchAdminData = async () => {
            if (!isAdmin) return;

            try {
                setLoading(true);
                // Fetch stats
                const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
                const { count: trackCount } = await supabase.from('tracks').select('*', { count: 'exact', head: true });

                // Fetch profiles
                const { data: profileList } = await supabase
                    .from('profiles')
                    .select('*')
                    .order('updated_at', { ascending: false });

                setStats({
                    users: userCount || 0,
                    tracks: trackCount || 0,
                    storage: '4.2 GB' // Mock for now
                });
                setProfiles(profileList || []);
            } catch (error) {
                console.error('Error fetching admin data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchAdminData();
    }, [isAdmin, supabase]);

    if (userLoading || loading) {
        return (
            <SpotilarkLayout>
                <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </SpotilarkLayout>
        );
    }

    if (!isAdmin) return null;

    const filteredProfiles = profiles.filter(p =>
        p.email?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <SpotilarkLayout>
            <div className="flex-1 p-8 overflow-y-auto pb-24 space-y-8 bg-gradient-to-b from-background to-muted/20">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Shield className="h-5 w-5 text-primary" />
                            <span className="text-xs font-black uppercase tracking-widest text-primary">Master Control</span>
                        </div>
                        <h1 className="text-4xl font-black tracking-tight">Admin Dashboard</h1>
                        <p className="text-muted-foreground">Managing {stats.users} souls and {stats.tracks} tracks across the larkverse.</p>
                    </div>
                    <Button variant="outline" className="rounded-full font-bold border-primary/20" onClick={() => router.push('/profile')}>
                        Back to Profile
                    </Button>
                </header>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="rounded-[30px] border-none shadow-sm bg-card/50 overflow-hidden relative group transition-transform active:scale-[0.98]">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Users className="h-24 w-24" />
                        </div>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Registered Users</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-black">{stats.users}</div>
                            <p className="text-xs text-muted-foreground mt-1">+2 from yesterday</p>
                        </CardContent>
                    </Card>

                    <Card className="rounded-[30px] border-none shadow-sm bg-card/50 overflow-hidden relative group transition-transform active:scale-[0.98]">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Music className="h-24 w-24" />
                        </div>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Cloud Tracks</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-black">{stats.tracks}</div>
                            <p className="text-xs text-muted-foreground mt-1">Global ecosystem library</p>
                        </CardContent>
                    </Card>

                    <Card className="rounded-[30px] border-none shadow-sm bg-card/50 overflow-hidden relative group transition-transform active:scale-[0.98]">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Database className="h-24 w-24" />
                        </div>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Storage Used</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-black text-primary">{stats.storage}</div>
                            <p className="text-xs text-muted-foreground mt-1">Cross-platform cached data</p>
                        </CardContent>
                    </Card>
                </div>

                {/* User Management Section */}
                <section className="space-y-4">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <h2 className="text-2xl font-black tracking-tight">User Management</h2>
                        <div className="relative w-full md:w-80">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by email..."
                                className="pl-10 rounded-full border-primary/10 bg-card/50"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    <Card className="rounded-[30px] border-none shadow-sm bg-card/50 overflow-hidden">
                        <div className="divide-y divide-primary/5">
                            {filteredProfiles.map((p) => (
                                <div key={p.id} className="p-4 flex items-center justify-between hover:bg-primary/5 transition-colors group">
                                    <div className="flex items-center gap-4">
                                        <Avatar className="h-10 w-10 border border-primary/10">
                                            <AvatarImage src={`https://api.dicebear.com/7.x/pixel-art/svg?seed=${p.id}`} />
                                            <AvatarFallback>{p.email?.charAt(0).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold">{p.email}</span>
                                                {p.role === 'admin' && (
                                                    <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-black rounded uppercase tracking-tighter">Admin</span>
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground">ID: {p.id.slice(0, 8)}...</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button variant="ghost" size="sm" className="rounded-full text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary/10">
                                            Manage <ChevronRight className="h-3 w-3 ml-1" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                            {filteredProfiles.length === 0 && (
                                <div className="p-12 text-center text-muted-foreground font-medium italic">
                                    No souls found matching your search...
                                </div>
                            )}
                        </div>
                    </Card>
                </section>
            </div>
        </SpotilarkLayout>
    );
}
