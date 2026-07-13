
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Folder,
  Home,
  ListMusic,
  Music,
  User,
  Video
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTheme } from "@/context/ThemeContext";

const menuItems = [
  { icon: Home, label: "Home", href: "/" },
  { icon: ListMusic, label: "Playlists", href: "/playlists" },
  { icon: Folder, label: "Folders", href: "/folders" },
  { icon: User, label: "Artists", href: "/artist" },
  { icon: Music, label: "Albums", href: "/albums" },
  { icon: Video, label: "Video", href: "/video" },
];

export const LeftSidebar = () => {
  const pathname = usePathname();
  const { theme } = useTheme();

  return (
    <aside className="w-64 flex-shrink-0 bg-background p-4 flex flex-col overflow-hidden">
      <div className="flex items-center gap-3 px-2 h-16">
        <div className="relative w-8 h-8">
          {theme === 'dark' ? (
            <img
              src="/spotilark-without-text-white.png"
              alt="Spotilark Logo"
              className="w-full h-full object-contain"
            />
          ) : (
            <img
              src="/spotilatk-without-text-black.png"
              alt="Spotilark Logo"
              className="w-full h-full object-contain"
            />
          )}
        </div>
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
    </aside>
  );
};
