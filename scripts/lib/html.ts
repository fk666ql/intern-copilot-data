import { decode } from "he";
import { parse } from "node-html-parser";

export function htmlToText(html: string): string {
  const decoded = decode(html);
  const root = parse(decoded);
  root.querySelectorAll("script,style,noscript").forEach((node) => node.remove());
  return root.structuredText
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n\n")
    .trim();
}
