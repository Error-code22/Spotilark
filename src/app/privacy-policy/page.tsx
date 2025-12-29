
import { SpotilarkLayout } from "@/components/spotilark-layout";
import Link from "next/link";

export default function PrivacyPolicyPage() {
  return (
    <SpotilarkLayout>
      <div className="flex-1 p-8 overflow-y-auto pb-24">
        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
        <div className="max-w-4xl mx-auto space-y-4 text-muted-foreground">
          <p>This is a placeholder for the Privacy Policy content.</p>
          <p>Your privacy is important to us. This policy explains how we collect, use, and protect your personal information.</p>
          <p>For more details, please contact us.</p>
          <Link href="/settings" className="underline">Go to Settings</Link>
        </div>
      </div>
    </SpotilarkLayout>
  );
}
