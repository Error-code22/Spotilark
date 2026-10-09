import PlaylistContentWrapper from "./PlaylistContentWrapper";

export function generateStaticParams() {
    return [{ id: 'placeholder', playlistName: 'placeholder' }];
}

export default async function Page({ params }: { params: Promise<{ id: string, playlistName: string }> }) {
    return <PlaylistContentWrapper />;
}
