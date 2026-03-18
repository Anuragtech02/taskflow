---
name: Resolve data on backend not frontend
description: User prefers data resolution (like ID-to-name mapping) to happen on the backend rather than frontend
type: feedback
---

When displaying human-readable names for IDs (like list names in activity logs), resolve them on the backend before sending to the frontend, rather than fetching extra data on the frontend to build lookup maps.

**Why:** The user called this out when I built a frontend list name map for activity log entries. The backend should store or resolve the name at write time or read time, not push that work to the client.

**How to apply:** When activity/audit logs reference entities by ID, either:
1. Store the name alongside the ID when creating the activity entry (denormalized), or
2. Join/resolve on the backend when returning activity data
