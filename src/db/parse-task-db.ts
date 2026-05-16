/**
 * Parse Task Database Utility Module
 *
 * Provides database utilities for parse task operations including:
 * - Path parsing (parse_osspath, build_source_key)
 * - Output path building (build_output_paths)
 * - MinIO path construction utilities
 */

/**
 * Parse osspath to extract source and version
 * osspath format: {source}/{version}
 * Example: "zsxq/20260515-202605151455-04" -> {source: "zsxq", version: "20260515-202605151455-04"}
 *
 * @param osspath - The osspath string from scrape_log
 * @returns Object with source and version
 */
export function parseOsspath(osspath: string): {
  source: string;
  version: string;
} {
  const parts = osspath.split('/');
  if (parts.length >= 2) {
    return {
      source: parts[0],
      version: parts.slice(1).join('/'),
    };
  }
  return { source: parts[0] || '', version: '' };
}

/**
 * Build MinIO source file key path
 * Format: {source}/{version}/{filename}
 *
 * @param source - Data source identifier (e.g., zsxq, xhs, report)
 * @param version - Version string (e.g., 20260515-202605151455-04)
 * @param filename - Original filename
 * @returns Full MinIO object key
 */
export function buildSourceKey(
  source: string,
  version: string,
  filename: string,
): string {
  return `${source}/${version}/${filename}`;
}

/**
 * Build output paths for parsed results
 * extracted/{source}/{version}/{filename}/{filename}.json
 * extracted/{source}/{version}/{filename}/{filename}.md
 *
 * @param source - Data source identifier
 * @param version - Version string
 * @param filename - Original filename
 * @returns Object containing all output paths
 */
export function buildOutputPaths(
  source: string,
  version: string,
  filename: string,
): {
  sourceFolder: string;
  outputFolder: string;
  jsonPath: string;
  mdPath: string;
  sourceFileKey: string;
} {
  const filenameWithoutExt = filename.replace(/\.[^.]+$/, '');
  const outputFolder = `extracted/${source}/${version}/${filename}`;
  const sourceFolder = `${source}/${version}`;

  return {
    sourceFolder,
    outputFolder,
    jsonPath: `${outputFolder}/${filenameWithoutExt}.json`,
    mdPath: `${outputFolder}/${filenameWithoutExt}.md`,
    sourceFileKey: `${sourceFolder}/${filename}`,
  };
}

/**
 * Generate task ID from components
 * Format: {source}_{version}_{timestamp}
 *
 * @param source - Data source identifier
 * @param version - Version string
 * @param timestamp - Optional timestamp (defaults to current time)
 * @returns Task ID string
 */
export function generateTaskId(
  source: string,
  version: string,
  timestamp?: Date,
): string {
  const ts = timestamp || new Date();
  const tsStr = ts
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
  return `${source}_${version}_${tsStr}`;
}

/**
 * Parse task ID to extract components
 * Task ID format: {source}_{version}_{timestamp}
 *
 * @param taskId - Task ID string
 * @returns Object with source, version, and timestamp
 */
export function parseTaskId(taskId: string): {
  source: string;
  version: string;
  timestamp: string;
} | null {
  const parts = taskId.split('_');
  if (parts.length < 3) return null;

  const timestamp = parts.pop() || '';
  const version = parts.join('_');
  const source = parts[0];

  return { source, version, timestamp };
}

/**
 * Validate status transition
 * Valid transitions: pending -> running -> success
 *                  pending -> running -> failed
 *                  failed -> pending (retry)
 *
 * @param currentStatus - Current task status
 * @param newStatus - New status to transition to
 * @returns Whether the transition is valid
 */
export function isValidStatusTransition(
  currentStatus: string,
  newStatus: string,
): boolean {
  const validTransitions: Record<string, string[]> = {
    pending: ['running', 'failed'],
    running: ['success', 'failed', 'partial'],
    failed: ['pending', 'running'],
    partial: ['pending', 'running', 'success'],
    success: [],
  };

  return validTransitions[currentStatus]?.includes(newStatus) ?? false;
}

/**
 * Check if source is a valid data source
 *
 * @param source - Source identifier
 * @returns Whether source is valid
 */
export function isValidSource(source: string): boolean {
  const validSources = ['zsxq', 'xhs', 'report', 'tushare'];
  return validSources.includes(source);
}
