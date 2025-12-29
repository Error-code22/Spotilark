"use client";

import { SpotilarkLayout } from "@/components/spotilark-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HardDrive, Cloud, Music, Github } from "lucide-react";
import Link from "next/link";
import Image from "next/image"; // Import Image component

const cloudServices = [
    { name: 'Google Drive', icon: '/images/google-drive-logo.png', description: 'Connect your Google Drive account to stream music directly.', type: 'oauth' },
    { name: 'Dropbox', icon: '/images/dropbox-logo.png', description: 'Connect your Dropbox account to stream music directly.', type: 'oauth' },
    { name: 'OneDrive', icon: '/images/onedrive-logo.png', description: 'Connect your OneDrive account to stream music directly.', type: 'oauth' },
    { name: 'Local NAS/Server', icon: HardDrive, description: 'Connect to a local network-attached storage or personal server.', type: 'manual' },
    // Add other cloud services here
];

export default function AddCloudServicePage() {
    return (
        <SpotilarkLayout>
            <div className="flex-1 p-8 overflow-y-auto pb-24">
                <h1 className="text-4xl font-bold mb-4">Add Cloud Service</h1>
                <p className="text-lg text-muted-foreground mb-8">
                    Choose a cloud storage service to connect and stream your music from.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {cloudServices.map((service) => (
                        <Card key={service.name} className="flex flex-col">
                            <CardContent className="p-6 flex-grow flex flex-col items-center text-center">
                                {typeof service.icon === 'string' ? (
                                    <Image src={service.icon} alt={`${service.name} logo`} width={64} height={64} className="mb-4" />
                                ) : (
                                    <service.icon className="h-16 w-16 text-primary mb-4" />
                                )}
                                <h2 className="text-2xl font-semibold mb-2">{service.name}</h2>
                                <p className="text-muted-foreground mb-4 flex-grow">{service.description}</p>
                                {service.type === 'oauth' ? (
                                    <Button asChild className="mt-auto">
                                        <Link href={`/api/auth/${service.name.toLowerCase().replace(/\s/g, '-')}`}>
                                            Connect {service.name}
                                        </Link>
                                    </Button>
                                ) : (
                                    <Button asChild className="mt-auto">
                                        <Link href={`/folders/connect-nas`}>
                                            Connect {service.name}
                                        </Link>
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </SpotilarkLayout>
    );
}
