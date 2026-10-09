import ProfileClient from "./ProfileClient";

export function generateStaticParams() {
    return [{ username: 'placeholder' }];
}

export default async function Page({ params }: { params: Promise<{ username: string }> }) {
    return <ProfileClient />;
}
