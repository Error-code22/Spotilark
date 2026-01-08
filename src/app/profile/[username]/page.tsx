import ProfileClient from "./ProfileClient";

// Set dynamicParams to false for static export
export const dynamicParams = false;

export function generateStaticParams() {
    return [
        { username: 'default' }
    ];
}

export default async function Page({ params }: { params: Promise<{ username: string }> }) {
    return <ProfileClient />;
}
