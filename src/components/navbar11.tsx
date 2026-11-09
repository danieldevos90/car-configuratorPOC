"use client";
import type { LucideIcon } from "lucide-react";
import {
  Book,
  Cloud,
  Code,
  Database,
  Gift,
  Globe,
  Heart,
  Layout,
  MenuIcon,
  Monitor,
  Paintbrush,
  Server,
  Settings,
  Shield,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Terminal,
  Users,
  X,
  Zap,
} from "lucide-react";
import { Fragment, useState } from "react";
import { cn } from "cn";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
interface MenuLink {
  label: string;
  description?: string;
  url: string;
  icon: LucideIcon;
}

interface MenuGroup {
  title: string;
  links: MenuLink[];
}

interface MenuItem {
  title: string;
  url?: string;
  groups?: MenuGroup[];
}

interface MobileNavigationMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const LOGO = {
  url: "/",
  alt: "Gelände Werke",
  title: "Gelände Werke",
};

const NAVIGATION: MenuItem[] = [
  {
    title: "Products",
    groups: [
      {
        title: "Company Blog",
        links: [
          {
            label: "Insights",
            icon: Book,
            description: "Company news and updates",
            url: "#",
          },
          {
            label: "Engineering",
            icon: Code,
            description: "Technical deep dives",
            url: "#",
          },
          {
            label: "Culture",
            icon: Users,
            description: "Team stories and values",
            url: "#",
          },
          {
            label: "Press",
            icon: Globe,
            description: "Media mentions",
            url: "#",
          },
        ],
      },
      {
        title: "Developer Tools",
        links: [
          {
            label: "API",
            icon: Monitor,
            description: "Access our REST API",
            url: "#",
          },
          {
            label: "CLI",
            icon: Terminal,
            description: "Command line tools",
            url: "#",
          },
          {
            label: "SDKs",
            icon: Code,
            description: "Integrate with our SDKs",
            url: "#",
          },
          {
            label: "Docs",
            icon: Book,
            description: "Complete documentation",
            url: "#",
          },
        ],
      },
      {
        title: "Commerce",
        links: [
          {
            label: "Store",
            icon: ShoppingCart,
            description: "Buy our products",
            url: "#",
          },
          {
            label: "Plans",
            icon: Database,
            description: "Subscription options",
            url: "#",
          },
          {
            label: "Mobile App",
            icon: Smartphone,
            description: "Shop on the go",
            url: "#",
          },
          {
            label: "Gift Cards",
            icon: Gift,
            description: "Send a gift instantly",
            url: "#",
          },
        ],
      },
    ],
  },
  {
    title: "Solutions",
    groups: [
      {
        title: "Industries",
        links: [
          {
            label: "E-commerce",
            icon: ShoppingCart,
            description: "Solutions for online stores",
            url: "#",
          },
          {
            label: "SaaS",
            icon: Cloud,
            description: "Tools for SaaS apps",
            url: "#",
          },
          {
            label: "Finance",
            icon: Shield,
            description: "Secure finance apps",
            url: "#",
          },
          {
            label: "Healthcare",
            icon: Heart,
            description: "For medical platforms",
            url: "#",
          },
        ],
      },
      {
        title: "Design System",
        links: [
          {
            label: "Components",
            icon: Layout,
            description: "Reusable UI parts",
            url: "#",
          },
          {
            label: "Tokens",
            icon: Settings,
            description: "Design tokens reference",
            url: "#",
          },
          {
            label: "Icons",
            icon: Sparkles,
            description: "Lucide icon library",
            url: "#",
          },
          {
            label: "Themes",
            icon: Paintbrush,
            description: "UI appearance presets",
            url: "#",
          },
        ],
      },
    ],
  },
  {
    title: "Platform",
    groups: [
      {
        title: "Core Services",
        links: [
          {
            label: "Hosting",
            icon: Server,
            description: "Reliable infrastructure",
            url: "#",
          },
          {
            label: "Auth",
            icon: Shield,
            description: "Secure login & roles",
            url: "#",
          },
          {
            label: "Database",
            icon: Database,
            description: "Scalable data storage",
            url: "#",
          },
          {
            label: "Edge Functions",
            icon: Zap,
            description: "Low-latency logic",
            url: "#",
          },
        ],
      },
    ],
  },
  {
    title: "Resources",
    url: "#",
  },
  {
    title: "Pricing",
    url: "#",
  },
];

const DESKTOP_BUTTONS = [
  {
    label: "Contact",
    isPrimary: false,
    url: "#",
  },
  {
    label: "Log in",
    isPrimary: false,
    url: "#",
  },
  {
    label: "Sign up",
    isPrimary: true,
    url: "#",
  },
];

const MOBILE_BUTTONS = [
  {
    label: "Sign up",
    isPrimary: true,
    url: "#",
  },
  {
    label: "Log in",
    isPrimary: false,
    url: "#",
  },
];

interface Navbar11Props {
  className?: string;
}

const Navbar11 = ({ className }: Navbar11Props) => {
  const [open, setOpen] = useState<boolean>(false);
  const cta = DESKTOP_BUTTONS.find((button) => button.isPrimary) ?? DESKTOP_BUTTONS[0];

  return (
    <Fragment>
      <header
        className={cn(
          "pointer-events-auto fixed inset-x-0 top-0 z-[60] flex h-16 w-full items-center bg-background px-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))]",
          className,
        )}
      >
        <Button
          className="size-11 shrink-0"
          variant="ghost"
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? (
            <X className="size-5 stroke-foreground" />
          ) : (
            <MenuIcon className="size-5 stroke-foreground" />
          )}
        </Button>
        <a
          href={LOGO.url}
          aria-label={LOGO.alt}
          className="absolute left-1/2 flex max-w-[46vw] -translate-x-1/2 items-center gap-2 text-sm font-semibold tracking-tight text-foreground"
        >
          <span
            aria-hidden
            className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground"
          >
            GW
          </span>
          <span className="truncate max-sm:sr-only">{LOGO.title}</span>
        </a>
        <Button
          size="sm"
          className="ml-auto shrink-0 text-primary-foreground"
          asChild
        >
          <a href={cta.url}>{cta.label}</a>
        </Button>
      </header>
      <MobileNavigationMenu open={open} onOpenChange={setOpen} />
    </Fragment>
  );
};

const MobileNavigationMenu = ({
  open,
  onOpenChange,
}: MobileNavigationMenuProps) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        aria-describedby={undefined}
        side="top"
        className="inset-0 z-[55] h-dvh w-full bg-background pt-16 [&>button]:hidden"
      >
        <div className="h-full overflow-y-auto pt-10 pb-20">
          <div className="container">
            <div className="absolute -m-px h-px w-px overflow-hidden border-0 mask-clip-border p-0 text-nowrap whitespace-nowrap">
              <SheetTitle className="text-primary">
                Mobile Navigation
              </SheetTitle>
            </div>
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-4">
                {MOBILE_BUTTONS.map((btn, index) => (
                  <Button
                    variant={!btn.isPrimary ? "outline" : "default"}
                    className={
                      btn.isPrimary
                        ? "text-primary-foreground"
                        : "text-foreground"
                    }
                    asChild
                    key={`navbar-btn-${index}`}
                  >
                    <a href={btn.url}>{btn.label}</a>
                  </Button>
                ))}
              </div>
              <Accordion type="multiple" className="w-full">
                {NAVIGATION.map((item, index) =>
                  renderMobileMenuItem(item, index),
                )}
              </Accordion>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

const renderMobileMenuItem = (item: MenuItem, index: number) => {
  if (item.groups) {
    return (
      <AccordionItem
        key={item.title}
        value={`nav-${index}`}
        className="border-b-0"
      >
        <AccordionTrigger className="h-[3.75rem] items-center p-0 !px-4 text-base leading-[3.75] font-normal text-muted-foreground hover:bg-muted hover:no-underline">
          {item.title}
        </AccordionTrigger>
        <AccordionContent className="max-h-[60dvh] overflow-x-auto">
          {item.groups.flatMap((group, groupIndex) =>
            group.links.map((link, linkIndex) => (
              <a
                key={`mobile-link-${groupIndex}-${linkIndex}`}
                href={link.url}
                className="flex h-12 items-center gap-2 rounded-lg px-4 text-muted-foreground transition-colors duration-300 hover:bg-muted hover:text-foreground"
              >
                <link.icon className="size-4 stroke-muted-foreground" />
                {link.label}
              </a>
            )),
          )}
        </AccordionContent>
      </AccordionItem>
    );
  }

  return (
    <a
      key={item.title}
      href={item.url}
      className="flex h-[3.75rem] items-center rounded-md p-0 px-4 text-left text-base leading-[3.75] font-normal text-muted-foreground ring-ring/10 outline-ring/50 transition-all hover:bg-muted focus-visible:ring-4 focus-visible:outline-1 nth-last-1:border-0"
    >
      {item.title}
    </a>
  );
};

export { Navbar11 };
