import PlaylistDetailsWrapper from "./PlaylistDetailsWrapper";

export function generateStaticParams() {
    return [{ id: 'placeholder' }];
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    return <PlaylistDetailsWrapper />;
}
