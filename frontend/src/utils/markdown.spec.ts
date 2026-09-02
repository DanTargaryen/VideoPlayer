import { describe, expect, it } from 'vitest';
import { renderMarkdown } from './markdown';

describe('markdown rendering', () => {
  it('renders paragraphs', () => expect(renderMarkdown('hello')).toBe('<p>hello</p>'));
  it('joins wrapped paragraph lines with breaks', () => expect(renderMarkdown('a\nb')).toBe('<p>a<br>b</p>'));
  it('normalizes CRLF', () => expect(renderMarkdown('a\r\nb')).toBe('<p>a<br>b</p>'));
  it('renders h1', () => expect(renderMarkdown('# title')).toContain('<h1>title</h1>'));
  it('renders h4', () => expect(renderMarkdown('#### title')).toContain('<h4>title</h4>'));
  it('renders unordered lists', () => expect(renderMarkdown('- a\n- b')).toBe('<ul><li>a</li><li>b</li></ul>'));
  it('accepts star unordered markers', () => expect(renderMarkdown('* a')).toBe('<ul><li>a</li></ul>'));
  it('renders ordered lists', () => expect(renderMarkdown('1. a\n2) b')).toBe('<ol><li>a</li><li>b</li></ol>'));
  it('closes lists before paragraphs', () => expect(renderMarkdown('- a\ntext')).toBe('<ul><li>a</li></ul><p>text</p>'));
  it('renders fenced code', () => expect(renderMarkdown('```\nconst x = 1;\n```')).toBe('<pre><code>const x = 1;</code></pre>'));
  it('escapes code HTML', () => expect(renderMarkdown('```\n<script>alert(1)</script>\n```')).toContain('&lt;script&gt;'));
  it('renders inline code', () => expect(renderMarkdown('use `npm test`')).toBe('<p>use <code>npm test</code></p>'));
  it('renders strong asterisks', () => expect(renderMarkdown('**bold**')).toBe('<p><strong>bold</strong></p>'));
  it('renders strong underscores', () => expect(renderMarkdown('__bold__')).toBe('<p><strong>bold</strong></p>'));
  it('renders emphasis', () => expect(renderMarkdown('*italic*')).toBe('<p><em>italic</em></p>'));
  it('escapes plain HTML', () => expect(renderMarkdown('<img src=x>')).toContain('&lt;img'));
  it('escapes ampersands', () => expect(renderMarkdown('a & b')).toContain('a &amp; b'));
  it('escapes quotes', () => expect(renderMarkdown('"quoted"')).toContain('&quot;quoted&quot;'));
  it('ignores blank lines', () => expect(renderMarkdown('a\n\nb')).toBe('<p>a</p><p>b</p>'));
  it('supports an unterminated code fence', () => expect(renderMarkdown('```\ncode')).toBe('<pre><code>code</code></pre>'));
});
