"use client";

import { useState } from "react";
import {
  MessageSquare,
  Plus,
  Settings,
  LogOut,
  Sparkles,
  MoreHorizontal,
  Trash2,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { signOut } from "next-auth/react";

interface Conversation {
  id: string;
  title: string;
  date: string;
}

const mockConversations: Conversation[] = [
  { id: "1", title: "Building a React App", date: "Today" },
  { id: "2", title: "TypeScript Best Practices", date: "Today" },
  { id: "3", title: "API Design Patterns", date: "Yesterday" },
  { id: "4", title: "Database Optimization", date: "Yesterday" },
  { id: "5", title: "CSS Grid Layout", date: "Last week" },
];

export default function Sidebar() {
  const [activeId, setActiveId] = useState("");

  const grouped = mockConversations.reduce(
    (acc, conv) => {
      if (!acc[conv.date]) acc[conv.date] = [];
      acc[conv.date].push(conv);
      return acc;
    },
    {} as Record<string, Conversation[]>,
  );

  function handleNewChat() {
    setActiveId("");
    window.dispatchEvent(new CustomEvent("new-chat"));
  }

  return (
    <div className="flex flex-col h-full bg-sidebar border-r border-sidebar-border">
      {/* Header */}
      <div className="p-4 shrink-0">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-sidebar-foreground flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-sidebar" />
          </div>
          <span className="font-semibold text-sidebar-foreground">
            Aria Chat
          </span>
        </div>

        <Button
          className="w-full justify-start gap-2 h-10"
          variant="default"
          onClick={handleNewChat}
        >
          <Plus className="w-4 h-4" />
          New Chat
        </Button>
      </div>

      {/* Conversations */}
      <ScrollArea className="flex-1 px-2">
        <div className="space-y-4 pb-4">
          {Object.entries(grouped).map(([date, conversations]) => (
            <div key={date}>
              <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {date}
              </p>
              <div className="space-y-0.5">
                {conversations.map((conv) => (
                  <div
                    key={conv.id}
                    className={cn(
                      "group flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer transition-colors",
                      activeId === conv.id
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50",
                    )}
                    onClick={() => setActiveId(conv.id)}
                  >
                    <MessageSquare className="w-4 h-4 shrink-0 opacity-60" />
                    <span className="flex-1 truncate text-sm">
                      {conv.title}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-sidebar-border transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem>
                          <Pencil className="w-4 h-4 mr-2" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive focus:text-destructive">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* User Section */}
      <div className="p-3 border-t border-sidebar-border shrink-0">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-sidebar-accent/50 cursor-pointer transition-colors">
          <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center">
            <span className="text-sm font-medium text-sidebar-foreground">
              JD
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              John Doe
            </p>
            <p className="text-xs text-muted-foreground truncate">
              admin
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1.5 rounded-lg hover:bg-sidebar-border transition-colors">
                <Settings className="w-4 h-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => signOut({ callbackUrl: "/" })}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
