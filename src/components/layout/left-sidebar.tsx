
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Folder,
  Home,
  ListMusic,
  Mails,
  Mic2,
  Music,
  Music2,
  Radio,
  Settings,
  User,
  UserRound
} from "lucide-react";
import { QueueList } from "./queue-list";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const menuItems = [
  { icon: Home, label: "Home", href: "/" },
  { icon: ListMusic, label: "Playlists", href: "/playlists" },
  { icon: Folder, label: "Folders", href: "/folders" },
  { icon: User, label: "Artists", href: "/artist" },
  { icon: Music, label: "Albums", href: "/albums" },
];

export const LeftSidebar = () => {
  const pathname = usePathname();

  return (
    <aside className="w-64 flex-shrink-0 bg-background p-4 flex flex-col gap-4 overflow-y-auto pb-48 scrollbar-hide">
      <div className="flex items-center gap-2 px-2 h-16">
        <Music2 className="text-foreground h-8 w-8" />
        <h1 className="text-2xl font-bold">Spotilark</h1>
      </div>
      <nav className="flex flex-col gap-2 mt-4">
        {menuItems.map(({ icon: Icon, label, href }) => {
          const active = pathname === href;
          return (
            <Link
              key={label}
              href={href}
              className={cn(
                buttonVariants({
                  variant: active ? "default" : "ghost",
                }),
                "justify-start gap-3 px-4 text-xl h-14 rounded-lg"
              )}
            >
              <Icon />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto">
        <QueueList />
      </div>
    </aside>
  );
};
