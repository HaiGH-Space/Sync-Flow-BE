# Breaking Change: Notifications Bulk Read WebSocket Optimization

**Date:** July 10, 2026  
**Status:** Implemented  
**Namespace:** `/notifications`  
**Target Team:** Frontend

---

## 1. Description of Change
To solve performance bottlenecks and event-loop blocking on bulk read operations (e.g. marking all user notifications read, or marking workspace invite notifications read), the backend has replaced individual individual-notification emissions (`O(N)`) with a single bulk event emission (`O(1)`).

- **For Single Updates:** The backend continues to emit the existing `notification_updated` event with the full single notification object.
- **For Bulk Updates:** The backend now emits a new, lightweight `notifications_bulk_updated` event containing only the list of updated notification IDs and the status.

## 2. Event Payload Definition

### **`notifications_bulk_updated`** (Bulk Updates)
Sent when multiple notifications are updated simultaneously.

- **Event Type:** WebSocket Emit (Server to Client)
- **Data Payload:**
```json
{
  "ids": ["string"],
  "status": "READ"
}
```

- **Example:**
```json
{
  "ids": [
    "notif-uuid-1",
    "notif-uuid-2",
    "notif-uuid-3"
  ],
  "status": "READ"
}
```

---

## 3. Required Frontend Migration Steps

The frontend must register a listener for this new event to update the local state and counters, since the individual `notification_updated` event will no longer be fired for bulk actions.

### Step 1: Register socket listener
In your notification service/hook/context where the WebSocket connection is initialized, register the `notifications_bulk_updated` listener alongside the existing listeners:

```typescript
// Subscribe to the new bulk update event
socket.on("notifications_bulk_updated", (data: { ids: string[]; status: 'READ' }) => {
  const { ids, status } = data;
  const isRead = status === 'READ';

  // 1. Update the list of notifications
  setNotifications((prevNotifications) =>
    prevNotifications.map((notif) =>
      ids.includes(notif.id)
        ? { ...notif, isRead, readAt: isRead ? new Date().toISOString() : null }
        : notif
    )
  );

  // 2. Decrement the unread badge count
  setUnreadCount((prevCount) => {
    const newlyReadCount = prevNotifications.filter(
      (notif) => ids.includes(notif.id) && !notif.isRead
    ).length;
    return Math.max(0, prevCount - newlyReadCount);
  });
});
```
