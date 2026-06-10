import { BadRequestException, Controller, Get, Headers, Query, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { Readable } from 'node:stream';

@Controller('media-proxy')
export class MediaProxyController {
  constructor(private readonly configService: ConfigService) {}

  @Get()
  async proxy(@Query('url') rawUrl: string | undefined, @Headers('range') range: string | undefined, @Res() response: Response) {
    const targetUrl = this.parseAllowedUrl(rawUrl);
    const upstream = await fetch(targetUrl, {
      headers: range ? { Range: range } : undefined,
    });

    response.status(upstream.status);
    this.copyHeaders(upstream, response);

    if (!upstream.body) {
      response.end();
      return;
    }

    Readable.fromWeb(upstream.body as unknown as Parameters<typeof Readable.fromWeb>[0]).pipe(response);
  }

  private parseAllowedUrl(rawUrl: string | undefined) {
    if (!rawUrl) {
      throw new BadRequestException('Media URL is required');
    }

    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      throw new BadRequestException('Invalid media URL');
    }

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new BadRequestException('Unsupported media URL protocol');
    }

    const allowedHosts = this.getAllowedHosts();
    if (!allowedHosts.has(parsed.host)) {
      throw new BadRequestException('Media host is not allowed');
    }

    return parsed;
  }

  private getAllowedHosts() {
    const publicBaseUrl = this.configService.get<string>('MINIO_PUBLIC_BASE_URL');
    const explicitHosts = this.configService.get<string>('MEDIA_PROXY_ALLOWED_HOSTS');
    const hosts = new Set(['127.0.0.1:9000', 'localhost:9000', '182.92.132.80:9000']);

    if (publicBaseUrl) {
      try {
        hosts.add(new URL(publicBaseUrl).host);
      } catch {
        // Ignore invalid optional config; upload paths will fail elsewhere if it is wrong.
      }
    }

    explicitHosts
      ?.split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .forEach((host) => hosts.add(host));

    return hosts;
  }

  private copyHeaders(upstream: globalThis.Response, response: Response) {
    [
      'accept-ranges',
      'cache-control',
      'content-length',
      'content-range',
      'content-type',
      'etag',
      'last-modified',
    ].forEach((name) => {
      const value = upstream.headers.get(name);
      if (value) {
        response.setHeader(name, value);
      }
    });
  }
}
