// Telegram Bot API (free). Messages are limited to 4096 chars, so long text is split.
const LIMIT = 3900;

export async function sendTelegram(html: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) throw new Error("Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID");

  for (const part of split(html)) {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: part, parse_mode: "HTML", disable_web_page_preview: true }),
    });
    if (!res.ok) throw new Error(`Telegram ${res.status}: ${await res.text()}`);
  }
}

// Split on blank lines so we never cut an HTML tag in half.
// A <pre> block (cover letter) can span blank lines, so close it at the cut and reopen it in the next part.
function split(text: string): string[] {
  const parts: string[] = [];
  let cur = "";
  for (const block of text.split("\n\n")) {
    if ((cur + "\n\n" + block).length > LIMIT && cur) {
      const open = preOpen(cur);
      parts.push(open ? `${cur}</pre>` : cur);
      cur = open ? `<pre>${block}` : block;
    } else {
      cur = cur ? `${cur}\n\n${block}` : block;
    }
  }
  if (cur) parts.push(cur);
  return parts;
}

// Content is HTML-escaped, so any literal <pre> / </pre> here is one of our own tags
function preOpen(s: string): boolean {
  return (s.match(/<pre>/g)?.length ?? 0) > (s.match(/<\/pre>/g)?.length ?? 0);
}
