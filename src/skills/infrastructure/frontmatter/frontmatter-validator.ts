import matter from 'gray-matter';
import { BadRequestException } from '@nestjs/common';

export interface SkillFrontmatter {
  name: string;
  description: string;
  category?: string;
  tags?: string[];
  files_index?: Array<{ path: string; description?: string }>;
}

export interface ParsedSkill {
  frontmatter: SkillFrontmatter;
  body: string;
}

export class FrontmatterValidator {
  static parse(markdown: string): ParsedSkill {
    let parsed: matter.GrayMatterFile<string>;
    try {
      parsed = matter(markdown);
    } catch (e) {
      throw new BadRequestException(
        `invalid frontmatter: ${(e as Error).message}`,
      );
    }

    const fm = parsed.data as Partial<SkillFrontmatter>;

    if (
      !fm.name ||
      typeof fm.name !== 'string' ||
      fm.name.length < 1 ||
      fm.name.length > 128
    ) {
      throw new BadRequestException('frontmatter.name must be 1-128 chars');
    }
    if (
      !fm.description ||
      typeof fm.description !== 'string' ||
      fm.description.length < 10 ||
      fm.description.length > 2000
    ) {
      throw new BadRequestException(
        'frontmatter.description must be 10-2000 chars',
      );
    }
    // ★ 2026-08-18:version 字段已废弃 — Skill 表是 unversioned,
    // upload 是 idempotent overwrite,不再需要 skill 版本号。

    return {
      frontmatter: {
        name: fm.name,
        description: fm.description,
        category: fm.category,
        tags: fm.tags,
        files_index: fm.files_index ?? [],
      },
      body: parsed.content,
    };
  }

  static validateFilesIndexExist(
    filesIndex: Array<{ path: string }>,
    existingPaths: Set<string>,
  ): void {
    for (const item of filesIndex) {
      if (!existingPaths.has(item.path)) {
        throw new BadRequestException(
          `files_index references missing path: ${item.path}`,
        );
      }
    }
  }
}
