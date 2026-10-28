import { useState } from "react";
import ChatIcon from "./icons.jsx";

// A small, safe Markdown renderer for assistant answers. It builds React elements
// (never raw HTML), supports the formatting the assistant uses, and only creates
// links to http(s), mailto, tel and pages of this site.

const SITE_PAGES = /(^|[\s(])(\/(?:about|projects|faq|contact))(?=[\s).,!?:;]|$)/g;
const INLINE = /(`[^`\n]+`)|(\*\*[^*\n]+\*\*)|(__[^_\n]+__)|(\*[^*\s][^*\n]*\*)|(\[[^\]\n]+\]\([^)\s]+\))|(https?:\/\/[^\s)<>]+[^\s)<>.,;:!?])|([A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\.[A-Za-z.]{2,})/g;

function safeHref(href) {
  if (/^(https?:|mailto:|tel:)/i.test(href)) return href;
  if (/^\/[A-Za-z0-9/_-]*$/.test(href)) return href;
  return null;
}

function Link({ href, children, onNavigate }) {
  const safe = safeHref(href);
  if (!safe) return children;
  if (safe.startsWith("/")) {
    return (
      <a
        href={safe}
        onClick={(event) => {
          event.preventDefault();
          onNavigate?.(safe);
        }}
      >
        {children}
      </a>
    );
  }
  return (
    <a href={safe} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

/** Inline formatting inside one line or paragraph. */
function renderInline(text, onNavigate, keyPrefix = "i") {
  // Turn bare mentions like "/contact" into markdown links first.
  const source = text.replace(SITE_PAGES, (_, before, path) => `${before}[${path}](${path})`);
  const nodes = [];
  let last = 0;
  let index = 0;

  for (const match of source.matchAll(INLINE)) {
    if (match.index > last) nodes.push(source.slice(last, match.index));
    const [token] = match;
    const key = `${keyPrefix}-${index++}`;

    if (match[1]) nodes.push(<code key={key}>{token.slice(1, -1)}</code>);
    else if (match[2] || match[3]) nodes.push(<strong key={key}>{renderInline(token.slice(2, -2), onNavigate, key)}</strong>);
    else if (match[4]) nodes.push(<em key={key}>{renderInline(token.slice(1, -1), onNavigate, key)}</em>);
    else if (match[5]) {
      const [, label, href] = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
      nodes.push(
        <Link key={key} href={href} onNavigate={onNavigate}>
          {label}
        </Link>
      );
    } else if (match[6]) {
      nodes.push(
        <Link key={key} href={token} onNavigate={onNavigate}>
          {token}
        </Link>
      );
    } else {
      nodes.push(
        <Link key={key} href={`mailto:${token}`} onNavigate={onNavigate}>
          {token}
        </Link>
      );
    }
    last = match.index + token.length;
  }
  if (last < source.length) nodes.push(source.slice(last));
  return nodes;
}

/** Splits text into blocks: code, headings, lists, quotes, rules and paragraphs. */
function parseBlocks(text) {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const blocks = [];
  let paragraph = [];

  const flush = () => {
    if (paragraph.length) blocks.push({ type: "p", text: paragraph.join("\n") });
    paragraph = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fence = /^\s*```\s*([\w+#.-]*)\s*$/.exec(line);

    if (fence) {
      flush();
      const code = [];
      i++;
      while (i < lines.length && !/^\s*```\s*$/.test(lines[i])) code.push(lines[i++]);
      blocks.push({ type: "code", lang: fence[1], text: code.join("\n") });
    } else if (/^\s*$/.test(line)) {
      flush();
    } else if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) {
      flush();
      blocks.push({ type: "hr" });
    } else if (/^#{1,4}\s+/.test(line)) {
      flush();
      blocks.push({ type: "h", level: Math.min(4, /^#+/.exec(line)[0].length), text: line.replace(/^#{1,4}\s+/, "") });
    } else if (/^\s*>\s?/.test(line)) {
      flush();
      const quote = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) quote.push(lines[i++].replace(/^\s*>\s?/, ""));
      i--;
      blocks.push({ type: "quote", text: quote.join("\n") });
    } else if (/^\s*([-*•]|\d+[.)])\s+/.test(line)) {
      flush();
      const ordered = /^\s*\d+[.)]\s+/.test(line);
      const items = [];
      while (i < lines.length && /^\s*([-*•]|\d+[.)])\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*([-*•]|\d+[.)])\s+/, ""));
      i--;
      blocks.push({ type: ordered ? "ol" : "ul", items });
    } else {
      paragraph.push(line);
    }
  }
  flush();
  return blocks;
}

function CodeBlock({ lang, text }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch (error) {
      /* clipboard can be blocked; nothing else to do */
    }
  };

  return (
    <div className="ai-code">
      <div className="ai-code-bar">
        <span>{lang || "code"}</span>
        <button type="button" onClick={copy}>
          <ChatIcon name={copied ? "check" : "copy"} size={15} />
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre>
        <code>{text}</code>
      </pre>
    </div>
  );
}

export default function Markdown({ text, onNavigate }) {
  const blocks = parseBlocks(text);

  return (
    <div className="ai-md">
      {blocks.map((block, index) => {
        const key = `b${index}`;
        switch (block.type) {
          case "code":
            return <CodeBlock key={key} lang={block.lang} text={block.text} />;
          case "h": {
            const Tag = `h${block.level + 1}`;
            return <Tag key={key}>{renderInline(block.text, onNavigate, key)}</Tag>;
          }
          case "ul":
            return (
              <ul key={key}>
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex}>{renderInline(item, onNavigate, `${key}-${itemIndex}`)}</li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={key}>
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex}>{renderInline(item, onNavigate, `${key}-${itemIndex}`)}</li>
                ))}
              </ol>
            );
          case "quote":
            return <blockquote key={key}>{renderInline(block.text, onNavigate, key)}</blockquote>;
          case "hr":
            return <hr key={key} />;
          default:
            return <p key={key}>{renderInline(block.text, onNavigate, key)}</p>;
        }
      })}
    </div>
  );
}
