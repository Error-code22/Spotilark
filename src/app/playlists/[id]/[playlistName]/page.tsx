import PlaylistContentWrapper from "./PlaylistContentWrapper";

export const dynamic = 'force-dynamic';

export default async function Page({ params }: { params: Promise<{ id: string, playlistName: string }> }) {
    // We don't even need to await params here if the child uses useParams(),
    // but having it defined this way makes Next.js happy for static export.
    return <PlaylistContentWrapper />;
}
