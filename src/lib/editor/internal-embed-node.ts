import { Node, mergeAttributes } from "@tiptap/core"
import { ReactNodeViewRenderer } from "@tiptap/react"
import { InternalEmbedCardView } from "@/components/editor/internal-embed-card-view"

export interface InternalEmbedAttrs {
  entityType: "task" | "doc"
  entityId: string
  workspaceId: string
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    internalEmbed: {
      insertInternalEmbed: (attrs: InternalEmbedAttrs) => ReturnType
    }
  }
}

export const InternalEmbedNode = Node.create({
  name: "internalEmbed",

  group: "block",

  atom: true,

  draggable: true,

  addAttributes() {
    return {
      entityType: {
        default: "task",
        parseHTML: (element: HTMLElement) => element.getAttribute("data-entity-type") || "task",
        renderHTML: (attributes: Record<string, string>) => ({ "data-entity-type": attributes.entityType }),
      },
      entityId: {
        default: "",
        parseHTML: (element: HTMLElement) => element.getAttribute("data-entity-id") || "",
        renderHTML: (attributes: Record<string, string>) => ({ "data-entity-id": attributes.entityId }),
      },
      workspaceId: {
        default: "",
        parseHTML: (element: HTMLElement) => element.getAttribute("data-workspace-id") || "",
        renderHTML: (attributes: Record<string, string>) => ({ "data-workspace-id": attributes.workspaceId }),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: "div[data-internal-embed]",
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes({ "data-internal-embed": "" }, HTMLAttributes)]
  },

  addNodeView() {
    return ReactNodeViewRenderer(InternalEmbedCardView)
  },

  addCommands() {
    return {
      insertInternalEmbed:
        (attrs) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs,
          })
        },
    }
  },
})
