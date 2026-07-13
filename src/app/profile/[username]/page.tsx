import ProfileClient from "./ProfileClient";

export const dynamic = 'force-dynamic';

export default async function Page({ params }: { params: Promise<{ username: string }> }) {
    return <ProfileClient />;
}
