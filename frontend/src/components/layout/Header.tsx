import { Menu } from "lucide-react";
import { type ReactNode } from "react";

interface HeaderProps {
  title: string;
  children?: ReactNode;
  onMenuClick: () => void;
}

export function Header({ title, children, onMenuClick }: HeaderProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <button
          className="rounded-md p-1.5 hover:bg-accent lg:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold">{title}</h1>
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </header>
  );
}
