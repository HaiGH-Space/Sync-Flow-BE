# Breaking Changes & Integration Guide

## WebSocket Event changes

### 1. New Bulk Notification Update Event (`notifications_bulk_updated`)

To optimize backend performance and reduce network saturation when marking multiple notifications read (e.g. marking all notifications as read, or invite notifications as read), the backend no longer emits multiple individual `notification_updated` events. Instead, it emits a single bulk event.

#### Details
* **Event Name:** `notifications_bulk_updated`
* **Recipient Room:** `${userId}` in namespace `/notifications`
* **Trigger Actions:** 
  * Marking all notifications as read (`markAllAsRead`)
  * Marking all notifications for a specific workspace invite as read (`markWorkspaceInviteNotificationsAsRead`)
* **Payload Schema:**
  ```json
  {
    "ids": ["string"],
    "status": "READ"
  }
  ```

#### Frontend Migration Steps
In your socket listener registration, implement a handler for the new bulk event. The handler should update the local notification list and decrement the unread badge count based on the array of modified IDs.

**Example Integration Snippet:**
```typescript
// Listen for bulk notification updates
socket.on("notifications_bulk_updated", (data: { ids: string[]; status: 'READ' }) => {
  const { ids, status } = data;
  const isRead = status === 'READ';

  // 1. Update state for all affected notifications
  setNotifications((prevNotifications) =>
    prevNotifications.map((notif) =>
      ids.includes(notif.id)
        ? { ...notif, isRead, readAt: isRead ? new Date().toISOString() : null }
        : notif
    )
  );

  // 2. Adjust local unread count badge
  setUnreadCount((prevCount) => {
    const newlyReadCount = prevNotifications.filter(
      (notif) => ids.includes(notif.id) && !notif.isRead
    ).length;
    return Math.max(0, prevCount - newlyReadCount);
  });
});
```
