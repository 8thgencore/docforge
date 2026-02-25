import {
  FileText,
  FolderKanban,
  type LucideIcon,
  Menu,
  MessageSquareText,
  PanelLeft,
  Pin,
  PinOff,
  Search,
  Settings,
  UploadCloud,
  X,
} from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";

import { Button } from "@/components/ui";
import { useI18n } from "@/shared/i18n/use-i18n";
import { cn } from "@/shared/lib/utils";

const DRAWER_STORAGE_KEYS = {
  collapsed: "docforge.drawer.collapsed",
  hidden: "docforge.drawer.hidden",
  pinned: "docforge.drawer.pinned",
} as const;

interface MenuItem {
  icon: LucideIcon;
  label: string;
  to: string;
}

interface MenuSection {
  items: MenuItem[];
  title: string;
}

interface AppLayoutProps {
  contentMode?: "constrained" | "full-bleed";
}

const readBool = (key: string, fallback: boolean) => {
  if (typeof window === "undefined") {
    return fallback;
  }
  const raw = window.localStorage.getItem(key);
  if (raw === null) {
    return fallback;
  }
  return raw === "1";
};

export const AppLayout = ({ contentMode = "constrained" }: AppLayoutProps) => {
  const { t } = useI18n();
  const location = useLocation();
  const overlayTitleId = useId();

  const [isPinned, setIsPinned] = useState(() => readBool(DRAWER_STORAGE_KEYS.pinned, true));
  const [isHidden, setIsHidden] = useState(() => readBool(DRAWER_STORAGE_KEYS.hidden, false));
  const [isCollapsed, setIsCollapsed] = useState(() => readBool(DRAWER_STORAGE_KEYS.collapsed, false));
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);

  const persistPinned = (value: boolean) => {
    setIsPinned(value);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(DRAWER_STORAGE_KEYS.pinned, value ? "1" : "0");
    }
  };

  const persistHidden = (value: boolean) => {
    setIsHidden(value);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(DRAWER_STORAGE_KEYS.hidden, value ? "1" : "0");
    }
  };

  const persistCollapsed = (value: boolean) => {
    setIsCollapsed(value);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(DRAWER_STORAGE_KEYS.collapsed, value ? "1" : "0");
    }
  };

  const menuSections = useMemo<MenuSection[]>(
    () => [
      {
        title: t("nav.sectionKnowledge"),
        items: [
          { to: "/search", label: t("nav.search"), icon: Search },
          { to: "/chat", label: t("nav.chat"), icon: MessageSquareText },
          { to: "/draft", label: t("nav.draft"), icon: FileText },
        ],
      },
      {
        title: t("nav.sectionProcessing"),
        items: [{ to: "/ingestion", label: t("nav.ingestion"), icon: UploadCloud }],
      },
      {
        title: t("nav.sectionWorkspace"),
        items: [{ to: "/groups", label: t("nav.groups"), icon: FolderKanban }],
      },
      {
        title: t("nav.sectionSystem"),
        items: [{ to: "/settings", label: t("nav.settings"), icon: Settings }],
      },
    ],
    [t],
  );
  const allItems = menuSections.flatMap((section) => section.items);
  const currentPageLabel =
    allItems.find((item) => location.pathname === item.to || location.pathname.startsWith(`${item.to}/`))?.label ??
    t("app.title");

  const isDockedOpen = isPinned && !isHidden;
  const isSidebarVisible = isPinned ? !isHidden : isOverlayOpen;
  const sidebarWidthClass = isCollapsed ? "w-20" : "w-72";

  const handleOpenSidebar = () => {
    if (isPinned) {
      if (isHidden) {
        persistHidden(false);
        persistCollapsed(false);
      } else {
        persistCollapsed(!isCollapsed);
      }
      return;
    }
    setIsOverlayOpen((prev) => !prev);
  };

  useEffect(() => {
    if (!isOverlayOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOverlayOpen(false);
      }
    };

    const prevBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = prevBodyOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOverlayOpen]);

  const sidebar = (isOverlay: boolean) => (
    <aside
      aria-label={t("nav.menu")}
      id="app-sidebar"
      className={cn(
        "border-border bg-card/95 flex h-full flex-col border-r backdrop-blur",
        isOverlay ? "w-72" : sidebarWidthClass,
      )}
    >
      <div
        className={cn(
          "border-border flex min-h-[69px] items-center border-b px-3 py-4",
          isCollapsed && !isOverlay ? "justify-center" : "justify-between",
        )}
      >
        <div className="flex items-center gap-2">
          <PanelLeft className="size-4" />
          {(!isCollapsed || isOverlay) && (
            <span className="font-semibold" id={isOverlay ? overlayTitleId : undefined}>
              {t("app.title")}
            </span>
          )}
        </div>
        {isOverlay && (
          <Button
            aria-label={t("drawer.close")}
            title={t("drawer.close")}
            variant="ghost"
            size="sm"
            onClick={() => setIsOverlayOpen(false)}
          >
            <X className="size-4" />
          </Button>
        )}
      </div>

      <nav aria-label={t("nav.menu")} className="flex-1 space-y-4 overflow-auto p-3">
        {menuSections.map((section) => (
          <section key={section.title} aria-label={section.title} className="space-y-1">
            {(!isCollapsed || isOverlay) && (
              <h2 className="text-muted-foreground px-2 text-xs tracking-wide uppercase">{section.title}</h2>
            )}
            <ul className="grid gap-1">
              {section.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    onClick={() => {
                      if (isOverlay) {
                        setIsOverlayOpen(false);
                      }
                    }}
                    aria-label={isCollapsed && !isOverlay ? item.label : undefined}
                    title={isCollapsed && !isOverlay ? item.label : undefined}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center rounded-md px-3 py-2 text-sm transition-colors",
                        isCollapsed && !isOverlay ? "justify-center" : "gap-2",
                        isActive ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted",
                      )
                    }
                  >
                    <item.icon className="size-4 shrink-0" />
                    {(!isCollapsed || isOverlay) && item.label}
                    {isCollapsed && !isOverlay && <span className="sr-only">{item.label}</span>}
                  </NavLink>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </nav>

      <div
        className={cn(
          "border-border border-t p-2",
          isCollapsed && !isOverlay ? "flex justify-center" : "flex justify-end",
        )}
      >
        <Button
          aria-label={isPinned ? t("drawer.unpin") : t("drawer.pin")}
          variant="ghost"
          size="sm"
          title={isPinned ? t("drawer.unpin") : t("drawer.pin")}
          onClick={() => {
            if (isOverlay) {
              persistPinned(true);
              persistHidden(false);
              persistCollapsed(false);
              setIsOverlayOpen(false);
              return;
            }

            persistPinned(!isPinned);
            if (!isPinned) {
              persistHidden(false);
              persistCollapsed(false);
            }
          }}
        >
          {isPinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}
        </Button>
      </div>
    </aside>
  );

  return (
    <div className="from-background via-background to-muted/40 text-foreground min-h-screen bg-gradient-to-b">
      <header
        className={cn(
          "border-border/60 bg-background/80 sticky top-0 z-20 border-b backdrop-blur",
          isDockedOpen && (isCollapsed ? "md:ml-20" : "md:ml-72"),
        )}
      >
        <div className="flex items-center gap-3 px-4 py-4 md:px-8">
          <Button
            aria-controls="app-sidebar"
            aria-expanded={isSidebarVisible}
            aria-label={t("nav.menu")}
            variant="outline"
            size="sm"
            onClick={handleOpenSidebar}
          >
            <Menu className="size-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{currentPageLabel}</h1>
          </div>
        </div>
      </header>

      {isDockedOpen && (
        <div className={cn("fixed top-0 left-0 z-40 hidden h-screen shadow-xl md:block", sidebarWidthClass)}>
          {sidebar(false)}
        </div>
      )}

      {isOverlayOpen && (
        <div className="fixed inset-0 z-50 bg-black/35" onClick={() => setIsOverlayOpen(false)}>
          <div
            aria-labelledby={overlayTitleId}
            aria-modal="true"
            className="h-full w-72 overflow-hidden"
            role="dialog"
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            {sidebar(true)}
          </div>
        </div>
      )}

      <main
        className={cn(
          contentMode === "full-bleed" ? "h-[calc(100vh-73px)] min-h-0 overflow-hidden" : "px-4 py-6 md:px-8",
          isDockedOpen && (isCollapsed ? "md:ml-20" : "md:ml-72"),
        )}
      >
        {contentMode === "full-bleed" ? (
          <Outlet />
        ) : (
          <div className="mx-auto w-full max-w-6xl space-y-6">
            <Outlet />
          </div>
        )}
      </main>
    </div>
  );
};
