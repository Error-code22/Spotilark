
import { SpotilarkLayout } from "@/components/spotilark-layout";

export default function RandomPage() {
  return (
    <SpotilarkLayout>
      <div className="flex-1 p-8 overflow-y-auto pb-24">
        <h1 className="text-4xl font-bold">Random</h1>
        <p className="mt-4 text-muted-foreground">Play a random selection of music.</p>
      </div>
    </SpotilarkLayout>
  );
}
