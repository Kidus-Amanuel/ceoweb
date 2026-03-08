"use client";

import { Notification } from "@/types/notifications";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  User,
  MessageSquare,
  FileCheck,
  Package,
  Truck,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onClose?: () => void;
}

const getCategoryIcon = (category: string) => {
  switch (category) {
    case "task":
      return <FileCheck className="w-4 h-4 text-blue-500" />;
    case "fleet":
      return <Truck className="w-4 h-4 text-amber-500" />;
    case "inventory":
      return <Package className="w-4 h-4 text-emerald-500" />;
    case "mention":
      return <MessageSquare className="w-4 h-4 text-purple-500" />;
    case "approval":
      return <CheckCircle2 className="w-4 h-4 text-indigo-500" />;
    case "hr":
      return <Users className="w-4 h-4 text-pink-500" />;
    case "system":
      return <Bell className="w-4 h-4 text-slate-500" />;
    default:
      return <Bell className="w-4 h-4 text-blue-500" />;
  }
};

const getEntityLink = (notification: Notification) => {
  const { metadata } = notification;
  if (!metadata) return null;

  switch (notification.category) {
    case "task":
      return metadata.task_id ? `/tasks/${metadata.task_id}` : "/projects";
    case "fleet":
      return metadata.vehicle_id
        ? `/fleet/vehicles`
        : "/fleet";
    case "inventory":
      return metadata.product_id
        ? `/inventory`
        : "/inventory";
    case "hr":
      return metadata.employee_id
        ? `/hr/employees`
        : "/hr";
    default:
      return metadata.link || null;
  }
};

export function NotificationItem({
  notification,
  onMarkAsRead,
  onClose,
}: NotificationItemProps) {
  const router = useRouter();
  const Icon = getCategoryIcon(notification.category);
  const link = getEntityLink(notification);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();

    // Mark as read if it's unread
    if (!notification.is_read) {
      onMarkAsRead(notification.id);
    }

    // Navigate if there's a link
    if (link) {
      router.push(link);
      onClose?.();
    }
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        "group relative flex gap-4 p-4 transition-all duration-200 cursor-pointer border-b border-border/40 last:border-0",
        notification.is_read
          ? "bg-transparent opacity-75"
          : "bg-primary/5 hover:bg-primary/10",
      )}
    >
      <div className="flex-shrink-0 mt-1">
        <div
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center border shadow-sm",
            notification.is_read
              ? "bg-muted border-border"
              : "bg-background border-primary/20",
          )}
        >
          {notification.actor_avatar ? (
            <Image
              src={notification.actor_avatar}
              alt={notification.actor_name || "User"}
              width={40}
              height={40}
              className="rounded-full object-cover"
              unoptimized
            />
          ) : (
            Icon
          )}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <h4
            className={cn(
              "text-sm font-semibold truncate",
              notification.is_read ? "text-foreground/70" : "text-foreground",
            )}
          >
            {notification.title}
          </h4>
          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
            {formatDistanceToNow(new Date(notification.created_at), {
              addSuffix: true,
            })}
          </span>
        </div>

        <p
          className={cn(
            "text-xs line-clamp-2",
            notification.is_read
              ? "text-muted-foreground/70"
              : "text-muted-foreground",
          )}
        >
          {notification.content}
        </p>
      </div>

      {!notification.is_read && (
        <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.6)]" />
      )}
    </div>
  );
}
