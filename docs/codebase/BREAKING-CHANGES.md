# Breaking Changes: WebSocket Notification Bulk Read Event

This document details the transition from individual $O(N)$ WebSocket event emissions on bulk notifications to a optimized single bulk emission event. Frontend developers must update their WebSocket listeners to handle the new bulk notification format.

---

## 1. Overview of Changes

To resolve performance and network saturation issues when users read multiple notifications at once (e.g., "Mark all as read" or joining a workspace invite), we have modified the notification WebSocket gateway behavior.

- **Single Updates**: The existing `notification_updated` event remains unchanged.
- **Bulk Updates**: Instead of emitting multiple `notification_updated` events sequentially, the backend now emits a single `notifications_bulk_updated` event with a lightweight payload.

---

## 2. Comparison: Old vs. New Behavior

### Old Behavior (O(N) Event Emissions)
When marking $N$ notifications as read, the backend would trigger $N$ individual event emissions.

* **Event Name**: `notification_updated` (multiple calls)
* **Payload**: Complete Notification object per event
* **WebSocket traffic**:
  ```json
  // Event 1
  {
    "event": "notification_updated",
    "data": {
      "id": "notif-1",
      "userId": "user-abc",
      "type": "WORKSPACE_INVITE",
      "title": "You were invited...",
      "message": "...",
      "isRead": true,
      "readAt": "2026-07-10T12:00:00.000Z"
    }
  }

  // Event 2
  {
    "event": "notification_updated",
    "data": {
      "id": "notif-2",
      "userId": "user-abc",
      "type": "WORKSPACE_INVITE",
      "title": "You were invited...",
      "message": "...",
      "isRead": true,
      "readAt": "2026-07-10T12:00:00.000Z"
    }
  }
  ```

### New Behavior (O(1) Event Emission)
When marking $N$ notifications as read, the backend triggers a single bulk event.

* **Event Name**: `notifications_bulk_updated`
* **Payload**: Lightweight object containing an array of affected notification IDs and their new status
* **WebSocket traffic**:
  ```json
  {
    "event": "notifications_bulk_updated",
    "data": {
      "ids": ["notif-1", "notif-2"],
      "status": "READ"
    }
  }
  ```

---

## 3. Frontend Integration Guide

Frontend applications must listen for the new `notifications_bulk_updated` event and update their local state accordingly.

### Example Integration (React/TypeScript)

```typescript
import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  readAt: string | null;
}

export function useNotifications(socket: Socket) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    // 1. Single Notification Update Listener (Unchanged)
    socket.on("notification_updated", (updatedNotif: Notification) => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === updatedNotif.id ? updatedNotif : n))
      );
      // Adjust unread count
      if (updatedNotif.isRead) {
        setUnreadCount((count) => Math.max(0, count - 1));
      }
    });

    // 2. Bulk Notifications Update Listener (New)
    socket.on("notifications_bulk_updated", (data: { ids: string[]; status: "READ" }) => {
      const { ids, status } = data;
      const isRead = status === "READ";

      setNotifications((prev) =>
        prev.map((n) =>
          ids.includes(n.id)
            ? { ...n, isRead, readAt: isRead ? new Date().toISOString() : null }
            : n
        )
      );

      // Decrement unread badge counter by the number of affected unread notifications
      setUnreadCount((count) => {
        const affectedUnread = notifications.filter(
          (n) => ids.includes(n.id) && !n.isRead
        ).length;
        return Math.max(0, count - affectedUnread);
      });
    });

    return () => {
      socket.off("notification_updated");
      socket.off("notifications_bulk_updated");
    };
  }, [socket, notifications]);

  return { notifications, unreadCount };
}
```
