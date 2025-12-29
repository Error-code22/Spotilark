
import { SpotilarkLayout } from "@/components/spotilark-layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";

const artists: any[] = [
  // Mock data removed. Will be populated from local storage.
];

export default function ArtistsPage() {
  return (
    <SpotilarkLayout>
      <div className="flex-1 p-8 overflow-y-auto pb-24">
        <h1 className="text-4xl font-bold">Artists</h1>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 mt-8">
          {artists.length > 0 ? artists.map((artist) => (
            <Link href="#" key={artist.name} className="block">
              <div className="flex flex-col items-center gap-4 group">
                <Avatar className="h-32 w-32 border-4 border-transparent group-hover:border-primary transition-all">
                  <AvatarImage src={artist.avatar} alt={artist.name} data-ai-hint={artist.avatarHint} />
                  <AvatarFallback>{artist.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <h3 className="font-semibold text-lg text-center">{artist.name}</h3>
              </div>
            </Link>
          )) : (
            <div className="col-span-full text-center py-16 text-muted-foreground">
              <p>No artists found.</p>
              <p className="text-sm">Your favorite artists will appear here.</p>
            </div>
          )}
        </div>
      </div>
    </SpotilarkLayout>
  );
}
