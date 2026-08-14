# Frontend Integration & Performance Scaling Guide

This guide outlines API contract behavior, optimization options, and recommended Frontend modifications introduced in the recent backend performance update (`fix/performance-and-scaling`).

---

## Table of Contents
1. [Compatibility Overview](#1-compatibility-overview)
2. [Optional Count Query in Pagination (`includeTotal`)](#2-optional-count-query-in-pagination-includetotal)
3. [Affected List Endpoints](#3-affected-list-endpoints)
4. [Workspace Invite Notifications Optimization](#4-workspace-invite-notifications-optimization)
5. [Frontend Recommended Implementation](#5-frontend-recommended-implementation)

---

## 1. Compatibility Overview

- **Backward Compatibility**: Fully backward compatible. Default requests without `includeTotal` continue to calculate and return `total` item count.
- **Breaking Changes**: None. All existing API contracts retain expected response fields by default.

---

## 2. Optional Count Query in Pagination (`includeTotal`)

### Query Parameter Details
The `PaginationQueryDto` accepts an optional boolean parameter `includeTotal`:

| Query Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `page` | `number` | `1` | Page number, starting from 1. |
| `limit` | `number` | `20` | Items per page (min 1, max 100). |
| `includeTotal` | `boolean` | `true` | When `true`, backend runs a `COUNT(*)` query. Set to `false` to skip `COUNT(*)` for optimal performance. |

### Response Schema Adjustment

When `includeTotal=true` (or omitted):
```json
{
  "items": [...],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

When `includeTotal=false`:
```json
{
  "items": [...],
  "total": undefined,
  "page": 1,
  "limit": 20
}
```

---

## 3. Affected List Endpoints

The following paginated list endpoints support the `includeTotal` option:

1. **Workspace Projects List**
   - `GET /workspaces/:workspaceId/projects?page=1&limit=20&includeTotal=false`
2. **Project Sprints List**
   - `GET /projects/:projectId/sprints?page=1&limit=20&includeTotal=false`
3. **Project Issues List**
   - `GET /projects/:projectId/issues?page=1&limit=20&includeTotal=false`
4. **User Workspaces List**
   - `GET /workspaces?page=1&limit=20&includeTotal=false`

---

## 4. Workspace Invite Notifications Optimization

- Backend refactored `NotificationsService.markWorkspaceInviteNotificationsAsRead` to perform a single batch `updateMany` database query.
- **Frontend Impact**: None required. Socket payloads (`emitNotificationsBulkUpdated`) and HTTP endpoints return the exact same notification structure (`READ` status updates) without breaking client-side notification feeds.

---

## 5. Frontend Recommended Implementation

### A. TypeScript Type Definitions

Update API DTOs and response types in your frontend codebase:

```typescript
// Query parameters DTO
export interface PaginationQuery {
  page?: number;
  limit?: number;
  includeTotal?: boolean; // Set to false to skip backend COUNT(*) query
}

// Paginated response wrapper
export interface PaginatedResponse<T> {
  items: T[];
  total?: number; // Optional when includeTotal is false
  page: number;
  limit: number;
}
```

### B. Usage Guidelines for Frontend UI

| UI Component / View | `includeTotal` Value | Reason / Pattern |
| :--- | :--- | :--- |
| **Numbered Pagination Data Tables** | `true` (default) | Requires total count to render page numbers e.g. "Page 1 of 10". |
| **Infinite Scroll Lists** (Issues, Feeds) | `false` | Pagination is checked via `items.length === limit` or `hasMore` flag. |
| **Dropdown / Picker Selectors** (Workspace / Project lists) | `false` | Only item array is needed for selector options. |
| **Background Refetches & Polling** | `false` | Avoids repeated database `COUNT(*)` overhead during quiet refreshes. |
