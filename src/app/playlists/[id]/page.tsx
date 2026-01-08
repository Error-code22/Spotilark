import PlaylistDetailsWrapper from "./PlaylistDetailsWrapper";

// Set dynamicParams to false for static export
export const dynamicParams = false;

export function generateStaticParams() {
    // Provide at least one valid path for the build to succeed
    return [
        { id: 'default' },
        { id: 'playing' }
    ];
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    return <PlaylistDetailsWrapper />;
}