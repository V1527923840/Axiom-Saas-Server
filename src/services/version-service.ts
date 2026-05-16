import { Injectable } from '@nestjs/common';
import { ScrapeLogService } from '../scrape-log/scrape-log.service';
import { OssService } from '../oss/oss.service';
import { parseOsspath } from '../db/parse-task-db';

export interface VersionInfo {
  source: string;
  version: string;
  fileCount: number;
  latestParseStatus: string | null;
  createdAt: Date;
}

export interface VersionFileInfo {
  key: string;
  filename: string;
  size: number;
  lastModified: string;
}

@Injectable()
export class VersionService {
  constructor(
    private readonly scrapeLogService: ScrapeLogService,
    private readonly ossService: OssService,
  ) {}

  /**
   * Get all available versions from scrape_log
   * Groups by source and version
   */
  async getVersions(source?: string): Promise<{ versions: VersionInfo[] }> {
    // Get all scrape logs
    const result = await this.scrapeLogService.findAllWithPagination({
      paginationOptions: { page: 1, limit: 1000 },
    });

    // Group by source and version
    const versionMap = new Map<string, VersionInfo>();

    for (const log of result.data) {
      if (!log.osspath) continue;

      // Filter by source if provided
      if (source && log.source !== source) continue;

      const { source: src, version } = parseOsspath(log.osspath);
      const key = `${src}:${version}`;

      if (!versionMap.has(key)) {
        versionMap.set(key, {
          source: src,
          version,
          fileCount: 0,
          latestParseStatus: null,
          createdAt: log.createdat,
        });
      }

      const existing = versionMap.get(key)!;
      existing.fileCount += log.filecount || 0;

      // Update latest parse status based on scrape log status
      if (log.status === 'success' && !existing.latestParseStatus) {
        existing.latestParseStatus = 'success';
      } else if (
        log.status === 'failed' &&
        existing.latestParseStatus !== 'failed'
      ) {
        existing.latestParseStatus = 'failed';
      } else if (log.status === 'running' && !existing.latestParseStatus) {
        existing.latestParseStatus = 'running';
      }
    }

    const versions = Array.from(versionMap.values()).sort((a, b) => {
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    return { versions };
  }

  /**
   * Get files for a specific version (source/version)
   */
  async getVersionFiles(
    source: string,
    version: string,
  ): Promise<{ files: VersionFileInfo[] }> {
    // List files from MinIO using the source/version path
    const path = `/${source}/${version}`;

    try {
      const result = await this.ossService.list(path, undefined, 1000);

      const files: VersionFileInfo[] = result.items
        .filter((item) => item.type === 'file')
        .map((item) => ({
          key: `${source}/${version}/${item.key}`,
          filename: item.key,
          size: item.size,
          lastModified: item.last_modified,
        }));

      return { files };
    } catch {
      // If path doesn't exist, return empty files
      return { files: [] };
    }
  }

  /**
   * Get unique sources
   */
  async getSources(): Promise<{ sources: string[] }> {
    const result = await this.scrapeLogService.findAllWithPagination({
      paginationOptions: { page: 1, limit: 1000 },
    });

    const sourceSet = new Set<string>();
    for (const log of result.data) {
      if (log.source) {
        sourceSet.add(log.source);
      }
    }

    return { sources: Array.from(sourceSet).sort() };
  }
}
