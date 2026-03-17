---
name: Clarify scope before implementing
description: User expects me to confirm scope when the request could apply to multiple features (tasks vs docs vs sprints)
type: feedback
---

When the user asks for a feature, don't assume which entity they mean. If they were just discussing docs and say "I want to drag and move in/out of a parent", they mean docs — not tasks. Ask to clarify if ambiguous, or default to the context of the current conversation.

**Why:** User asked about doc children, then asked for drag-to-reparent. I assumed tasks and built a whole drag-drop system for the task list view, which wasn't what they wanted.

**How to apply:** Before implementing, confirm which entity/page the feature applies to when the conversation has been about multiple features.
