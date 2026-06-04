"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useState } from "react";
import {
  Bold,
  Italic,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Heading2,
  Code,
  Link as LinkIcon,
  Undo2,
  Redo2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isRichTextEmpty } from "@/lib/sanitize";

/**
 * WYSIWYG editor. Keeps a hidden input (named `name`) in sync with the editor
 * HTML so it submits inside a normal <form>. Sends "" when visually empty.
 */
export function RichTextEditor({
  name,
  defaultValue = "",
  placeholder = "Write a detailed description…",
}: {
  name: string;
  defaultValue?: string;
  placeholder?: string;
}) {
  const [html, setHtml] = useState(defaultValue);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        link: {
          openOnClick: false,
          HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
        },
      }),
    ],
    content: defaultValue,
    editorProps: {
      attributes: {
        class: "tiptap px-3 py-2 text-sm",
        "data-placeholder": placeholder,
      },
    },
    onUpdate: ({ editor }) => setHtml(editor.getHTML()),
  });

  return (
    <div className="rounded-md border border-border bg-white focus-within:ring-2 focus-within:ring-primary/30">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
      <input type="hidden" name={name} value={isRichTextEmpty(html) ? "" : html} />
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor | null }) {
  if (!editor) return null;

  const Btn = ({
    onClick,
    active,
    label,
    children,
  }: {
    onClick: () => void;
    active?: boolean;
    label: string;
    children: React.ReactNode;
  }) => (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded hover:bg-slate-100",
        active && "bg-slate-200 text-foreground",
      )}
    >
      {children}
    </button>
  );

  const setLink = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", prev ?? "https://");
    if (url === null) return;
    if (url === "") editor.chain().focus().unsetLink().run();
    else editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-border px-1.5 py-1 text-slate-600">
      <Btn label="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold className="h-4 w-4" />
      </Btn>
      <Btn label="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic className="h-4 w-4" />
      </Btn>
      <Btn label="Strikethrough" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>
        <Strikethrough className="h-4 w-4" />
      </Btn>
      <span className="mx-1 h-5 w-px bg-border" />
      <Btn label="Heading" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
        <Heading2 className="h-4 w-4" />
      </Btn>
      <Btn label="Bullet list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <List className="h-4 w-4" />
      </Btn>
      <Btn label="Numbered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <ListOrdered className="h-4 w-4" />
      </Btn>
      <Btn label="Quote" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        <Quote className="h-4 w-4" />
      </Btn>
      <Btn label="Code" active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()}>
        <Code className="h-4 w-4" />
      </Btn>
      <Btn label="Link" active={editor.isActive("link")} onClick={setLink}>
        <LinkIcon className="h-4 w-4" />
      </Btn>
      <span className="mx-1 h-5 w-px bg-border" />
      <Btn label="Undo" onClick={() => editor.chain().focus().undo().run()}>
        <Undo2 className="h-4 w-4" />
      </Btn>
      <Btn label="Redo" onClick={() => editor.chain().focus().redo().run()}>
        <Redo2 className="h-4 w-4" />
      </Btn>
    </div>
  );
}
