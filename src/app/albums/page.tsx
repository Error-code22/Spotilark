
import { SpotilarkLayout } from "@/components/spotilark-layout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link";

const albums: any[] = [
  // Mock data removed. Will be populated from local storage.
];


export default function AlbumsPage() {
  return (
    <SpotilarkLayout>
      <div className="flex-1 p-8 overflow-y-auto pb-24">
        <h1 className="text-4xl font-bold">Albums</h1>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 mt-8">
            {albums.length > 0 ? albums.map((album) => (
                <Link href="#" key={album.title} className="block">
                    <Card className="hover:bg-accent transition-colors">
                        <CardHeader className="p-0">
                            <div className="relative aspect-square w-full rounded-t-lg overflow-hidden">
                                <Image 
                                    src={album.cover}
                                    alt={album.title}
                                    fill
                                    className="object-cover"
                                    data-ai-hint={album.coverHint}
                                />
                            </div>
                        </CardHeader>
                        <CardContent className="p-4">
                            <h3 className="font-semibold text-lg truncate">{album.title}</h3>
                            <p className="text-sm text-muted-foreground mt-1 truncate">{album.artist}</p>
                        </CardContent>
                    </Card>
                </Link>
            )) : (
              <div className="col-span-full text-center py-16 text-muted-foreground">
                <p>No albums found.</p>
                <p className="text-sm">Your albums will appear here once you add them.</p>
              </div>
            )}
        </div>
      </div>
    </SpotilarkLayout>
  );
}
