export interface BBCodeTag {
  id: string;
  label: string;
  icon: string;
  openTag: string;
  closeTag: string;
  hotkey?: string;
  description: string;
  /** Tags that require a user-input value (e.g. color, size) */
  hasValue?: boolean;
  valuePlaceholder?: string;
  /** If true, after inserting the openTag, insert a newline before closeTag */
  multiline?: boolean;
  /** If true, the tag is self-closing (no content between) */
  selfClosing?: boolean;
}

export interface TagCategory {
  id: string;
  label: string;
  icon: string;
  tags: BBCodeTag[];
}

export const tagCategories: TagCategory[] = [
  {
    id: "formatting",
    label: "Text Formatting",
    icon: "📝",
    tags: [
      {
        id: "bold",
        label: "Bold",
        icon: "𝐁",
        openTag: "[b]",
        closeTag: "[/b]",
        hotkey: "b",
        description: "Makes text bold",
      },
      {
        id: "italic",
        label: "Italic",
        icon: "𝑰",
        openTag: "[i]",
        closeTag: "[/i]",
        hotkey: "i",
        description: "Makes text italic",
      },
      {
        id: "underline",
        label: "Underline",
        icon: "𝑼",
        openTag: "[u]",
        closeTag: "[/u]",
        hotkey: "u",
        description: "Underlines text",
      },
      {
        id: "strikethrough",
        label: "Strikethrough",
        icon: "𝐒̶",
        openTag: "[s]",
        closeTag: "[/s]",
        hotkey: "shift+s",
        description: "Strikes through text",
      },
      {
        id: "size",
        label: "Size",
        icon: "📏",
        openTag: "[size=",
        closeTag: "[/size]",
        hotkey: "shift+x",
        description: "Sets text size (50-200)",
        hasValue: true,
        valuePlaceholder: "100",
      },
      {
        id: "color",
        label: "Color",
        icon: "🎨",
        openTag: "[color=",
        closeTag: "[/color]",
        hotkey: "shift+c",
        description: "Colors text with hex or name",
        hasValue: true,
        valuePlaceholder: "#FF0000",
      },
      {
        id: "highlight",
        label: "Highlight",
        icon: "🖍️",
        openTag: "[highlight=",
        closeTag: "[/highlight]",
        hotkey: "shift+h",
        description: "Highlights text",
        hasValue: true,
        valuePlaceholder: "yellow",
      },
      {
        id: "shadow",
        label: "Shadow",
        icon: "👻",
        openTag: "[shadow=",
        closeTag: "[/shadow]",
        hotkey: "shift+w",
        description: "Adds shadow to text",
        hasValue: true,
        valuePlaceholder: "gray",
      },
    ],
  },
  {
    id: "images",
    label: "Images",
    icon: "🖼️",
    tags: [
      {
        id: "img",
        label: "Image",
        icon: "🖼️",
        openTag: "[img]",
        closeTag: "[/img]",
        hotkey: "shift+i",
        description: "Inserts an image from URL",
      },
      {
        id: "fimg",
        label: "Fixed Image",
        icon: "📐",
        openTag: "[fimg=",
        closeTag: "[/fimg]",
        hasValue: true,
        valuePlaceholder: "300,200",
        description: "Image with fixed dimensions (width,height)",
      },
      {
        id: "fpimg",
        label: "Percent Image",
        icon: "📊",
        openTag: "[fpimg=",
        closeTag: "[/fpimg]",
        hasValue: true,
        valuePlaceholder: "50,50",
        description: "Image scaled by percentage (width%,height%)",
      },
    ],
  },
  {
    id: "layout",
    label: "Layout",
    icon: "📐",
    tags: [
      {
        id: "divbox",
        label: "Divbox",
        icon: "📦",
        openTag: "[divbox=",
        closeTag: "[/divbox]",
        hotkey: "shift+d",
        description: "Creates a colored box section",
        hasValue: true,
        valuePlaceholder: "white",
      },
      {
        id: "spoil",
        label: "Spoiler",
        icon: "🔒",
        openTag: "[spoil]",
        closeTag: "[/spoil]",
        hotkey: "shift+p",
        description: "Hides content behind a spoiler toggle",
      },
      {
        id: "spoiler",
        label: "Spoiler (Titled)",
        icon: "🔐",
        openTag: "[spoiler=",
        closeTag: "[/spoiler]",
        hotkey: "shift+o",
        description: "Hides content with a custom title",
        hasValue: true,
        valuePlaceholder: "Click to reveal",
      },
      {
        id: "hr",
        label: "Horizontal Rule",
        icon: "➖",
        openTag: "[hr]",
        closeTag: "",
        hotkey: "shift+r",
        description: "Inserts a horizontal divider line",
        selfClosing: true,
      },
      {
        id: "center",
        label: "Center",
        icon: "↔️",
        openTag: "[center]",
        closeTag: "[/center]",
        hotkey: "shift+e",
        description: "Centers content",
      },
      {
        id: "right",
        label: "Right",
        icon: "➡️",
        openTag: "[right]",
        closeTag: "[/right]",
        hotkey: "shift+g",
        description: "Right-aligns content",
      },
      {
        id: "left",
        label: "Left",
        icon: "⬅️",
        openTag: "[left]",
        closeTag: "[/left]",
        description: "Left-aligns content (default)",
      },
      {
        id: "float",
        label: "Float",
        icon: "🔄",
        openTag: "[float=",
        closeTag: "[/float]",
        hasValue: true,
        valuePlaceholder: "left or right",
        description: "Floats content to left or right",
      },
    ],
  },
  {
    id: "lists",
    label: "Lists",
    icon: "📋",
    tags: [
      {
        id: "list",
        label: "List (Bullet)",
        icon: "•",
        openTag: "[list]\n[*] ",
        closeTag: "\n[/list]",
        hotkey: "shift+l",
        description: "Creates a bulleted list",
        multiline: true,
      },
      {
        id: "list-numbered",
        label: "List (Numbered)",
        icon: "1.",
        openTag: "[list=1]\n[*] ",
        closeTag: "\n[/list]",
        description: "Creates a numbered list",
        multiline: true,
      },
      {
        id: "list-alpha",
        label: "List (Alpha)",
        icon: "A.",
        openTag: "[list=a]\n[*] ",
        closeTag: "\n[/list]",
        description: "Creates an alphabetically ordered list",
        multiline: true,
      },
      {
        id: "list-none",
        label: "List (Indent)",
        icon: "↪️",
        openTag: "[list=none]\n[*] ",
        closeTag: "\n[/list]",
        description: "Creates an indented block without bullets",
        multiline: true,
      },
    ],
  },
  {
    id: "links",
    label: "Links & Navigation",
    icon: "🔗",
    tags: [
      {
        id: "url",
        label: "URL Link",
        icon: "🔗",
        openTag: "[url=",
        closeTag: "[/url]",
        hotkey: "k",
        description: "Creates a clickable link",
        hasValue: true,
        valuePlaceholder: "https://...",
      },
      {
        id: "goto",
        label: "Goto",
        icon: "🔽",
        openTag: "[goto=",
        closeTag: "[/goto]",
        hotkey: "shift+t",
        description: "Creates a link to an anchor within the post",
        hasValue: true,
        valuePlaceholder: "anchor-name",
      },
      {
        id: "anchor",
        label: "Anchor",
        icon: "📌",
        openTag: "[anchor]",
        closeTag: "[/anchor]",
        description: "Creates an anchor point for Goto links",
      },
    ],
  },
  {
    id: "structure",
    label: "Structure",
    icon: "🏗️",
    tags: [
      {
        id: "code",
        label: "Code Block",
        icon: "💻",
        openTag: "[code]\n",
        closeTag: "\n[/code]",
        hotkey: "shift+m",
        description: "Creates a code block (for commenting out BBCode)",
        multiline: true,
      },
      {
        id: "comment",
        label: "Comment",
        icon: "💬",
        openTag: "[c]",
        closeTag: "[/c]",
        description: "Short inline comment tag",
      },
      {
        id: "spacer",
        label: "Spacer",
        icon: "⬜",
        openTag: "[color=transparent]",
        closeTag: "[/color]",
        hotkey: "shift+z",
        description: "Invisible spacer text (useful for layout)",
        hasValue: true,
        valuePlaceholder: "SPACER",
      },
      {
        id: "ol-spacer",
        label: "Small Spacer",
        icon: "↕️",
        openTag: "[ol]",
        closeTag: "[/ol]",
        description: "Small vertical bump spacer using empty ordered list",
      },
    ],
  },
  {
    id: "departments",
    label: "Department Tags",
    icon: "🏛️",
    tags: [
      {
        id: "lsems-subtitle",
        label: "LSEMS Subtitle",
        icon: "🚑",
        openTag: "[lsemssubtitle]",
        closeTag: "[/lsemssubtitle]",
        description: "LSEMS department subtitle embed",
      },
      {
        id: "lspd-subtitle",
        label: "LSPD Subtitle",
        icon: "🚔",
        openTag: "[lspdsubtitle]",
        closeTag: "[/lspdsubtitle]",
        description: "LSPD department subtitle embed",
      },
      {
        id: "lssd-subtitle",
        label: "LSSD Subtitle",
        icon: "👮",
        openTag: "[lssdsubtitle]",
        closeTag: "[/lssdsubtitle]",
        description: "LSSD department subtitle embed",
      },
      {
        id: "sasg-subtitle",
        label: "SASG Subtitle",
        icon: "🛡️",
        openTag: "[sasgsubtitle]",
        closeTag: "[/sasgsubtitle]",
        description: "SASG department subtitle embed",
      },
      {
        id: "doc-subtitle",
        label: "DOC Subtitle",
        icon: "🔒",
        openTag: "[docsubtitle]",
        closeTag: "[/docsubtitle]",
        description: "DOC department subtitle embed",
      },
      {
        id: "lsems-footer",
        label: "LSEMS Footer",
        icon: "🚑",
        openTag: "[lsemsfooter]",
        closeTag: "[/lsemsfooter]",
        description: "LSEMS department footer embed",
      },
      {
        id: "lspd-footer",
        label: "LSPD Footer",
        icon: "🚔",
        openTag: "[lspdfooter]",
        closeTag: "[/lspdfooter]",
        description: "LSPD department footer embed",
      },
      {
        id: "lssd-footer",
        label: "LSSD Footer",
        icon: "👮",
        openTag: "[lssdfooter]",
        closeTag: "[/lssdfooter]",
        description: "LSSD department footer embed",
      },
      {
        id: "sasg-footer",
        label: "SASG Footer",
        icon: "🛡️",
        openTag: "[sasgfooter]",
        closeTag: "[/sasgfooter]",
        description: "SASG department footer embed",
      },
      {
        id: "doc-footer",
        label: "DOC Footer",
        icon: "🔒",
        openTag: "[docfooter]",
        closeTag: "[/docfooter]",
        description: "DOC department footer embed",
      },
    ],
  },
];

export function getAllTags(): BBCodeTag[] {
  return tagCategories.flatMap((cat) => cat.tags);
}

export function findTagById(id: string): BBCodeTag | undefined {
  return getAllTags().find((t) => t.id === id);
}

/** Format the hotkey string for display */
export function formatHotkey(hotkey: string | undefined): string {
  if (!hotkey) return "";
  const parts = hotkey.split("+");
  const ctrl = "Ctrl";
  const key = parts
    .map((p) => {
      if (p === "shift") return "Shift";
      if (p === "alt") return "Alt";
      if (p === "ctrl") return "Ctrl";
      return p.toUpperCase();
    })
    .join("+");
  return `${ctrl}+${key}`;
}
