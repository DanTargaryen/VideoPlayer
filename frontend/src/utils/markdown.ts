type ListType = 'ul' | 'ol';

export function renderMarkdown(source: string) {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const html: string[] = [];
  const paragraphLines: string[] = [];
  const codeLines: string[] = [];
  let listType: ListType | null = null;
  let inCodeBlock = false;

  const closeList = () => {
    if (!listType) {
      return;
    }

    html.push(`</${listType}>`);
    listType = null;
  };

  const flushParagraph = () => {
    if (paragraphLines.length === 0) {
      return;
    }

    html.push(`<p>${paragraphLines.map((line) => renderInlineMarkdown(line)).join('<br>')}</p>`);
    paragraphLines.length = 0;
  };

  const flushCodeBlock = () => {
    html.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
    codeLines.length = 0;
  };

  const openList = (nextType: ListType) => {
    flushParagraph();

    if (listType === nextType) {
      return;
    }

    closeList();
    listType = nextType;
    html.push(`<${nextType}>`);
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (inCodeBlock) {
      if (/^```/.test(trimmed)) {
        flushCodeBlock();
        inCodeBlock = false;
      } else {
        codeLines.push(line);
      }
      continue;
    }

    if (/^```/.test(trimmed)) {
      flushParagraph();
      closeList();
      inCodeBlock = true;
      continue;
    }

    if (!trimmed) {
      flushParagraph();
      closeList();
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      flushParagraph();
      closeList();
      const level = headingMatch[1].length;
      html.push(`<h${level}>${renderInlineMarkdown(headingMatch[2])}</h${level}>`);
      continue;
    }

    const unorderedMatch = trimmed.match(/^[-*]\s+(.+)$/);
    if (unorderedMatch) {
      openList('ul');
      html.push(`<li>${renderInlineMarkdown(unorderedMatch[1])}</li>`);
      continue;
    }

    const orderedMatch = trimmed.match(/^\d+[.)]\s+(.+)$/);
    if (orderedMatch) {
      openList('ol');
      html.push(`<li>${renderInlineMarkdown(orderedMatch[1])}</li>`);
      continue;
    }

    closeList();
    paragraphLines.push(line);
  }

  if (inCodeBlock) {
    flushCodeBlock();
  }

  flushParagraph();
  closeList();

  return html.join('');
}

function renderInlineMarkdown(source: string) {
  const parts = source.split(/(`[^`]*`)/g);

  return parts
    .map((part) => {
      if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
        return `<code>${escapeHtml(part.slice(1, -1))}</code>`;
      }

      return applyInlineFormatting(escapeHtml(part));
    })
    .join('');
}

function applyInlineFormatting(source: string) {
  return source
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>')
    .replace(/\*([^*\s][^*]*?)\*/g, '<em>$1</em>');
}

function escapeHtml(source: string) {
  return source
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}