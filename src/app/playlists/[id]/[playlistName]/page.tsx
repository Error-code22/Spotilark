import PlaylistContentWrapper from "./PlaylistContentWrapper";

// Set dynamicParams to false for static export
export const dynamicParams = false;

export function generateStaticParams() {
    // Provide at least one valid path for the build to succeed
    return [
        { id: 'default', playlistName: 'default' }
    ];
}

export default async function Page({ params }: { params: Promise<{ id: string, playlistName: string }> }) {
    // We don't even need to await params here if the child uses useParams(),
    // but having it defined this way makes Next.js happy for static export.
    return <PlaylistContentWrapper />;
}
