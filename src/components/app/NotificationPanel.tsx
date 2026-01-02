"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface Notification {
  id: string;
  type: "success" | "info" | "warning" | "action";
  title: string;
  message: string;
  actionLabel?: string;
  actionTab?: string;
  onAction?: () => void;
  autoDismiss?: number;
}

interface NotificationPanelProps {
  notifications: Notification[];
  onDismiss: (id: string) => void;
  onNavigate?: (tab: string) => void;
}

export function NotificationPanel({ notifications, onDismiss, onNavigate }: NotificationPanelProps) {
  const [visibleNotifications, setVisibleNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    setVisibleNotifications(notifications);
  }, [notifications]);

  useEffect(() => {
    notifications.forEach((notification) => {
      if (notification.autoDismiss) {
        const timer = setTimeout(() => {
          onDismiss(notification.id);
        }, notification.autoDismiss);

        return () => clearTimeout(timer);
      }
    });
  }, [notifications, onDismiss]);

  if (visibleNotifications.length === 0) return null;

  const getNotificationStyles = (type: Notification["type"]) => {
    switch (type) {
      case "success":
        return "bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-300";
      case "warning":
        return "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300";
      case "action":
        return "bg-primary/10 border-primary/30 text-primary";
      default:
        return "bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-300";
    }
  };

  const getIcon = (type: Notification["type"]) => {
    switch (type) {
      case "success":
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case "warning":
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case "action":
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 w-full max-w-sm space-y-2 md:top-6 md:right-6">
      <AnimatePresence>
        {visibleNotifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            transition={{ duration: 0.3 }}
          >
            <Card className={cn("p-4 border shadow-lg", getNotificationStyles(notification.type))}>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">{getIcon(notification.type)}</div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm mb-1">{notification.title}</h4>
                  <p className="text-sm opacity-90">{notification.message}</p>
                  {notification.actionLabel && (notification.actionTab || notification.onAction) && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-3 min-h-[44px] sm:min-h-[36px]"
                      onClick={() => {
                        if (notification.actionTab && onNavigate) {
                          onNavigate(notification.actionTab);
                        }
                        if (notification.onAction) {
                          notification.onAction();
                        }
                        onDismiss(notification.id);
                      }}
                    >
                      {notification.actionLabel}
                    </Button>
                  )}
                </div>
                <button
                  onClick={() => onDismiss(notification.id)}
                  className="flex-shrink-0 text-current opacity-50 hover:opacity-100 transition-opacity min-w-[44px] min-h-[44px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center"
                  aria-label="Dismiss"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}


