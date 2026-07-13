import PlaylistDetailsWrapper from "./PlaylistDetailsWrapper";

export const dynamic = 'force-dynamic';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    return <PlaylistDetailsWrapper />;
}