import { Injectable } from '@nestjs/common';
import { readFile } from 'node:fs/promises';
import * as path from 'node:path';

import { SITE_KNOWLEDGE_SOURCES } from './constants/site-knowledge-sources';

export interface KnowledgeSnippet {
  source: string;
  excerpt: string;
  score: number;
}

interface IndexedChunk {
  source: string;
  text: string;
}

const CHUNK_MAX_LENGTH = 900;
const CHUNK_OVERLAP = 120;
const MAX_RETURN_SNIPPETS = 5;
const DEFAULT_SCORE_BONUS = 2;
const KEYWORD_PATTERN = /[\u4e00-\u9fa5A-Za-z0-9_]+/g;

@Injectable()
export class SiteKnowledgeService {
  private readonly indexedChunks: IndexedChunk[] = [];
  private initialized = false;

  async search(query: string): Promise<KnowledgeSnippet[]> {
    await this.ensureIndexed();

    const keywords = this.extractKeywords(query);
    if (keywords.length === 0) {
      return [];
    }

    return this.indexedChunks
      .map((chunk) => ({
        source: chunk.source,
        text: chunk.text,
        score: this.scoreChunk(chunk.text, keywords),
      }))
      .filter((item) => item.score > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, MAX_RETURN_SNIPPETS)
      .map((item) => ({
        source: item.source,
        excerpt: this.trimExcerpt(item.text),
        score: item.score,
      }));
  }

  private async ensureIndexed() {
    if (this.initialized) {
      return;
    }

    this.initialized = true;
    const candidateRoots = this.getCandidateRoots();

    for (const source of SITE_KNOWLEDGE_SOURCES) {
      const raw = await this.readSourceFromRoots(candidateRoots, source);
      if (!raw) {
        continue;
      }

      this.indexedChunks.push(...this.splitIntoChunks(source, raw));
    }
  }

  private getCandidateRoots() {
    const cwd = process.cwd();
    return Array.from(new Set([cwd, path.resolve(cwd, '..')]));
  }

  private async readSourceFromRoots(roots: string[], source: string) {
    for (const root of roots) {
      try {
        return await readFile(path.resolve(root, source), 'utf8');
      } catch {
        continue;
      }
    }

    return '';
  }

  private splitIntoChunks(source: string, content: string): IndexedChunk[] {
    const normalized = content.replace(/\r\n/g, '\n');
    const paragraphs = normalized
      .split(/\n{2,}/)
      .map((item) => item.trim())
      .filter(Boolean);

    const chunks: IndexedChunk[] = [];
    let buffer = '';

    for (const paragraph of paragraphs) {
      if (buffer.length + paragraph.length + 2 > CHUNK_MAX_LENGTH && buffer) {
        chunks.push({ source, text: buffer.trim() });
        const tail = buffer.slice(Math.max(0, buffer.length - CHUNK_OVERLAP));
        buffer = tail ? `${tail}\n\n${paragraph}` : paragraph;
      } else {
        buffer = buffer ? `${buffer}\n\n${paragraph}` : paragraph;
      }
    }

    if (buffer.trim()) {
      chunks.push({ source, text: buffer.trim() });
    }

    return chunks.length > 0 ? chunks : [{ source, text: normalized.slice(0, CHUNK_MAX_LENGTH) }];
  }

  private extractKeywords(query: string) {
    const rawTerms = query.match(KEYWORD_PATTERN) ?? [];
    const stopWords = new Set(['如何', '怎么', '怎样', '请问', '一下', '一个', '这个', '那个', '什么', '为什么', '可以', '是否']);
    const keywords = rawTerms
      .map((item) => item.trim())
      .filter((item) => item.length >= 2 && !stopWords.has(item))
      .slice(0, 8);

    return keywords.length > 0 ? keywords : rawTerms.slice(0, 4);
  }

  private scoreChunk(text: string, keywords: string[]) {
    const lowerText = text.toLowerCase();
    let score = 0;

    for (const keyword of keywords) {
      const lowerKeyword = keyword.toLowerCase();
      const matches = lowerText.split(lowerKeyword).length - 1;
      if (matches > 0) {
        score += matches * (keyword.length >= 4 ? 4 : 2);
      }

      const normalizedKeyword = this.normalizeKeyword(keyword);
      if (normalizedKeyword && lowerText.includes(normalizedKeyword)) {
        score += DEFAULT_SCORE_BONUS;
      }
    }

    const joinedKeywords = keywords.join('');
    if (/投稿|上传|审核|发布|封面|草稿/.test(text) && /投稿|上传|审核|发布/.test(joinedKeywords)) {
      score += 5;
    }

    if (/直播|开播|回放/.test(text) && /直播|开播/.test(joinedKeywords)) {
      score += 4;
    }

    if (/评论|弹幕|点赞|收藏|投币/.test(text) && /评论|弹幕|点赞|收藏|投币/.test(joinedKeywords)) {
      score += 4;
    }

    return score;
  }

  private normalizeKeyword(keyword: string) {
    return keyword.replace(/\s+/g, '').toLowerCase();
  }

  private trimExcerpt(text: string) {
    const compact = text.replace(/\s+/g, ' ').trim();
    return compact.length > 420 ? `${compact.slice(0, 420)}...` : compact;
  }
}
