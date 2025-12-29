
import { SpotilarkLayout } from "@/components/spotilark-layout";
import { TrackList } from "@/components/layout/track-list";


export default async function Home() {
  return (
    <SpotilarkLayout>
      <TrackList />
    </SpotilarkLayout>
  );
}
