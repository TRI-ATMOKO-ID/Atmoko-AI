import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { createChat } from "@/lib/scholarbot.functions";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { BookOpen, Library, LogOut, MessageSquarePlus, MessageSquare } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export function AppSidebar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const createChatFn = useServerFn(createChat);

  const { data: chats } = useQuery({
    queryKey: ["chats", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chats").select("id,title,updated_at")
        .order("updated_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const newChat = async () => {
    const chat = await createChatFn({ data: {} });
    qc.invalidateQueries({ queryKey: ["chats"] });
    navigate({ to: "/app/$chatId", params: { chatId: chat.id } });
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link to="/app" className="flex items-center gap-2 px-2 py-3">
          <BookOpen className="w-5 h-5 text-accent" />
          <span className="font-serif text-lg">ScholarBot</span>
        </Link>
        <Button onClick={newChat} className="mx-2 mb-2 bg-accent text-accent-foreground hover:bg-accent/90">
          <MessageSquarePlus className="w-4 h-4 mr-2" /> Chat baru
        </Button>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Perpustakaan</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/app/library"}>
                  <Link to="/app/library">
                    <Library className="w-4 h-4" />
                    <span>Referensi tersimpan</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Riwayat chat</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {(chats ?? []).map((c) => (
                <SidebarMenuItem key={c.id}>
                  <SidebarMenuButton asChild isActive={pathname === `/app/${c.id}`}>
                    <Link to="/app/$chatId" params={{ chatId: c.id }}>
                      <MessageSquare className="w-4 h-4" />
                      <span className="truncate">{c.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {chats && chats.length === 0 && (
                <p className="px-3 py-2 text-xs text-muted-foreground">Belum ada riwayat</p>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="px-2 py-2 text-xs text-muted-foreground truncate">{user?.email}</div>
        <Button variant="ghost" size="sm" onClick={() => signOut().then(() => navigate({ to: "/login" }))}>
          <LogOut className="w-4 h-4 mr-2" /> Keluar
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
