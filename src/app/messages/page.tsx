
import { SpotilarkLayout } from "@/components/spotilark-layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Search, Send, Smile, MessageSquare } from "lucide-react";

const conversations: any[] = [
  // Mock data removed.
];

const currentChat: any = null; // Mock data removed

export default function MessagesPage() {
  return (
    <SpotilarkLayout>
      <div className="flex h-full">
        <aside className="w-80 border-r flex flex-col">
            <div className="p-4 border-b">
                <h1 className="text-2xl font-bold">Messages</h1>
                 <div className="relative mt-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-5 w-5" />
                    <Input placeholder="Search conversations..." className="pl-10" />
                </div>
            </div>
            <ScrollArea className="flex-1">
                {conversations.length > 0 ? conversations.map(convo => (
                    <div key={convo.name} className={cn("flex items-center gap-4 p-4 cursor-pointer hover:bg-accent", convo.active && "bg-accent")}>
                        <Avatar>
                            <AvatarImage src={convo.avatar} alt={convo.name} data-ai-hint={convo.avatarHint} />
                            <AvatarFallback>{convo.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 truncate">
                            <div className="flex justify-between items-center">
                                <h3 className="font-semibold">{convo.name}</h3>
                                <p className="text-xs text-muted-foreground">{convo.time}</p>
                            </div>
                            <p className="text-sm text-muted-foreground truncate">{convo.lastMessage}</p>
                        </div>
                    </div>
                )) : (
                  <div className="text-center py-16 text-muted-foreground">
                    <p>No conversations yet.</p>
                  </div>
                )}
            </ScrollArea>
        </aside>
        <main className="flex-1 flex flex-col">
          {currentChat ? (
            <>
              <header className="p-4 border-b flex items-center gap-4">
                  <Avatar>
                      <AvatarImage src="https://placehold.co/100x100.png" alt={currentChat.name} data-ai-hint="retro grid" />
                      <AvatarFallback>{currentChat.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                      <h2 className="text-xl font-bold">{currentChat.name}</h2>
                      <p className="text-sm text-muted-foreground">Active now</p>
                  </div>
              </header>
              <ScrollArea className="flex-1 p-6">
                  <div className="space-y-6">
                      {currentChat.messages.map((msg: any, index: number) => (
                          <div key={index} className={cn("flex gap-3", msg.sender === 'me' ? 'justify-end' : 'justify-start')}>
                            {msg.sender === 'other' && (
                                  <Avatar className="h-8 w-8">
                                      <AvatarImage src="https://placehold.co/100x100.png" alt={currentChat.name} data-ai-hint="retro grid" />
                                      <AvatarFallback>{currentChat.name.charAt(0)}</AvatarFallback>
                                  </Avatar>
                            )}
                            <div className={cn("max-w-xs md:max-w-md p-3 rounded-lg", msg.sender === 'me' ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                              {msg.text}
                            </div>
                          </div>
                      ))}
                  </div>
              </ScrollArea>
              <footer className="p-4 border-t">
                  <div className="relative">
                      <Input placeholder="Type a message..." className="pr-24 h-12" />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
                          <Button variant="ghost" size="icon" className="rounded-full">
                              <Smile className="text-muted-foreground" />
                          </Button>
                          <Button size="icon" className="rounded-full">
                              <Send />
                          </Button>
                      </div>
                  </div>
              </footer>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4">
              <MessageSquare className="h-24 w-24" />
              <h2 className="text-2xl font-semibold">No Chat Selected</h2>
              <p>Select a conversation from the list to start chatting.</p>
            </div>
          )}
        </main>
      </div>
    </SpotilarkLayout>
  );
}
