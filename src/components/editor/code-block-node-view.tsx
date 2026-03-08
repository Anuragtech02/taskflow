import { NodeViewContent, NodeViewWrapper } from "@tiptap/react"
import type { NodeViewProps } from "@tiptap/react"

const LANGUAGES = [
  { value: "", label: "auto" },
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "python", label: "Python" },
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "json", label: "JSON" },
  { value: "bash", label: "Bash" },
  { value: "sql", label: "SQL" },
  { value: "rust", label: "Rust" },
  { value: "go", label: "Go" },
  { value: "java", label: "Java" },
  { value: "c", label: "C" },
  { value: "cpp", label: "C++" },
  { value: "csharp", label: "C#" },
  { value: "php", label: "PHP" },
  { value: "ruby", label: "Ruby" },
  { value: "swift", label: "Swift" },
  { value: "kotlin", label: "Kotlin" },
  { value: "yaml", label: "YAML" },
  { value: "xml", label: "XML" },
  { value: "markdown", label: "Markdown" },
  { value: "dockerfile", label: "Dockerfile" },
  { value: "graphql", label: "GraphQL" },
]

export function CodeBlockNodeView({ node, updateAttributes, extension }: NodeViewProps) {
  return (
    <NodeViewWrapper className="code-block-wrapper relative">
      <select
        contentEditable={false}
        className="absolute right-2 top-2 z-10 rounded border border-border bg-background px-2 py-0.5 text-xs text-muted-foreground outline-none hover:text-foreground focus:ring-1 focus:ring-primary"
        value={node.attrs.language || ""}
        onChange={(e) => updateAttributes({ language: e.target.value })}
      >
        {LANGUAGES.map((lang) => (
          <option key={lang.value} value={lang.value}>
            {lang.label}
          </option>
        ))}
      </select>
      <pre>
        <NodeViewContent as={"code" as any} />
      </pre>
    </NodeViewWrapper>
  )
}
