import { FrontmatterValidator } from './frontmatter-validator';

const VALID_MD = `---
name: 财报基础
description: 分析上市公司财务报表的核心方法
version: 1
files_index:
  - path: principles.md
---
# 财报基础

正文...
`;

describe('FrontmatterValidator', () => {
  it('should parse valid frontmatter', () => {
    const parsed = FrontmatterValidator.parse(VALID_MD);
    expect(parsed.frontmatter.name).toBe('财报基础');
    expect(parsed.frontmatter.version).toBe(1);
    expect(parsed.frontmatter.files_index).toHaveLength(1);
    expect(parsed.body).toContain('# 财报基础');
  });

  it('should reject missing name', () => {
    expect(() =>
      FrontmatterValidator.parse('---\ndescription: x\n---\nbody'),
    ).toThrow(/name/);
  });

  it('should reject too-short description', () => {
    expect(() =>
      FrontmatterValidator.parse('---\nname: x\ndescription: short\n---\nbody'),
    ).toThrow(/description/);
  });

  it('should detect missing files_index path', () => {
    const filesIndex = [{ path: 'missing.md' }];
    const existingPaths = new Set(['actual.md']);
    expect(() =>
      FrontmatterValidator.validateFilesIndexExist(filesIndex, existingPaths),
    ).toThrow(/missing/);
  });
});
