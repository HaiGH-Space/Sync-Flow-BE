# Backend Pagination & Frontend Integration Guide

To prevent performance degradation and manage large datasets efficiently, the backend enforces default-enforced pagination on key list endpoints. This document outlines the API contracts and provides code patterns for integration with the frontend using TanStack Query.

---

## 1. API Contract

### Request Parameters
Every paginated list endpoint accepts the following optional query parameters:

| Parameter | Type | Default | Constraints | Description |
|-----------|------|---------|-------------|-------------|
| `page`    | `number` | `1` | Min: `1` | Page number to fetch (1-indexed) |
| `limit`   | `number` | `20` | Min: `1`, Max: `100` | Number of items per page |

### Response Wrapper Shape
Due to the NestJS global response interceptor wrapping all successful response payloads inside a top-level `data` field, the response payload is wrapped as follows:

```typescript
interface PaginatedResponse<T> {
  statusCode: number;
  message: string;
  data: {
    items: T[];       // Array of items on the current page
    total: number;     // Total number of items across all pages
    page: number;      // Current page number (echoed back)
    limit: number;     // Number of items per page (echoed back)
  };
}
```

---

## 2. Affected Endpoints

The following endpoints have been migrated to the paginated response envelope structure:

1. **Workspaces list:**
   * **Endpoint:** `GET /workspaces/me`
   * **Query Type:** `PaginationQueryDto`
   * **Items:** `WorkspaceEntity[]`

2. **Projects list:**
   * **Endpoint:** `GET /workspaces/:workspaceId/projects`
   * **Query Type:** `PaginationQueryDto`
   * **Items:** `ProjectEntity[]`

3. **Sprints list:**
   * **Endpoint:** `GET /projects/:projectId/sprints`
   * **Query Type:** `PaginationQueryDto`
   * **Items:** `SprintEntity[]`

4. **Issues list:**
   * **Endpoint:** `GET /projects/:projectId/issues`
   * **Query Type:** `PaginationQueryDto`
   * **Items:** `IssueWithAssigneeEntity[]`

---

## 3. Frontend Integration (TanStack Query)

When integrating these endpoints in the frontend React app, ensure that:
1. You pass `page` and `limit` to the query function.
2. You include the current `page` and `limit` in your `queryKey` so that changing pages triggers a refetch automatically.
3. You handle the new `{ items, total, page, limit }` data envelope.

### React Query v5 / TanStack Query Example

Here is a typical implementation using `useQuery` for fetching issues with pagination:

```typescript
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import axios from 'axios';

interface Issue {
  id: string;
  title: string;
  status: string;
  assignee: { id: string; name: string; avatarUrl?: string } | null;
}

interface PaginatedIssuesResponse {
  statusCode: number;
  message: string;
  data: {
    items: Issue[];
    total: number;
    page: number;
    limit: number;
  };
}

export function useIssues(projectId: string, page: number = 1, limit: number = 20) {
  return useQuery({
    queryKey: ['issues', projectId, { page, limit }],
    queryFn: async () => {
      const response = await axios.get<PaginatedIssuesResponse>(
        `/projects/${projectId}/issues`,
        { params: { page, limit } }
      );
      return response.data.data; // Retrieve the inner paginated envelope
    },
    // Keep previous page's data visible while fetching the next page
    placeholderData: keepPreviousData,
  });
}
```

### Component Integration Example

```tsx
import React, { useState } from 'react';
import { useIssues } from './useIssues';

export function IssueList({ projectId }: { projectId: string }) {
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data, isLoading, isError, isPlaceholderData } = useIssues(projectId, page, limit);

  if (isLoading) return <div>Loading issues...</div>;
  if (isError) return <div>Error loading issues.</div>;

  const { items: issues, total } = data;
  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <ul className="space-y-2">
        {issues.map(issue => (
          <li key={issue.id} className="p-4 border rounded shadow-sm">
            <h4 className="font-semibold">{issue.title}</h4>
            <span className="text-sm text-gray-500">Status: {issue.status}</span>
          </li>
        ))}
      </ul>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between mt-4">
        <button
          onClick={() => setPage(old => Math.max(old - 1, 1))}
          disabled={page === 1}
          className="px-4 py-2 border rounded disabled:opacity-50"
        >
          Previous
        </button>
        
        <span>Page {page} of {totalPages}</span>

        <button
          onClick={() => {
            if (!isPlaceholderData && page < totalPages) {
              setPage(old => old + 1);
            }
          }}
          disabled={isPlaceholderData || page >= totalPages}
          className="px-4 py-2 border rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
```
