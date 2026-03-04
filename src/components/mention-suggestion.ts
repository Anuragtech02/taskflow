import { ReactRenderer } from "@tiptap/react"
import tippy, { type Instance as TippyInstance } from "tippy.js"
import SuggestionList from "./mention-suggestion-list"
import { PluginKey } from "@tiptap/pm/state"

export default (mentions: { id: string; name: string; email: string }[]) => {
  return {
    pluginKey: new PluginKey("mention"),
    items: ({ query }: { query: string }) => {
      if (!query) return mentions.slice(0, 10)
      const lowerQuery = query.toLowerCase()
      return mentions
        .filter(
          (m) =>
            m.name.toLowerCase().includes(lowerQuery) ||
            m.email.toLowerCase().includes(lowerQuery)
        )
        .slice(0, 10)
    },
    render: () => {
      let component: ReactRenderer | null = null
      let popup: TippyInstance[] | null = null

      return {
        onStart: (props: any) => {
          component = new ReactRenderer(SuggestionList, {
            props,
            editor: props.editor,
          })

          if (!props.clientRect) return

          popup = tippy("body", {
            getReferenceClientRect: props.clientRect,
            appendTo: () => document.body,
            content: component.element,
            showOnCreate: true,
            interactive: true,
            trigger: "manual",
            placement: "bottom-start",
          })
        },
        onUpdate: (props: any) => {
          component?.updateProps(props)

          if (!props.clientRect) return

          popup?.[0]?.setProps({
            getReferenceClientRect: props.clientRect,
          })
        },
        onKeyDown: (props: any) => {
          if (props.event.key === "Escape") {
            popup?.[0]?.hide()
            return true
          }

          return (component?.ref as any)?.onKeyDown(props)
        },
        onExit: () => {
          popup?.[0]?.destroy()
          component?.destroy()
          popup = null
          component = null
        },
      }
    },
  }
}
