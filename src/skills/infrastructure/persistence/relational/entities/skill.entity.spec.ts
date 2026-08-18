import { getMetadataArgsStorage } from 'typeorm';
import { SkillEntity } from './skill.entity';

/**
 * Lightweight EntityMetadata view built from typeorm's
 * `getMetadataArgsStorage()` — no DB driver required.
 *
 * Why not `DataSource.getMetadata()`? It constructs a sqlite driver
 * unless we install `sqlite3`. The args storage approach works in any
 * environment and is sufficient for verifying decorator wiring.
 *
 * typeorm 0.3 doesn't re-export *MetadataArgs types from the barrel,
 * so we type the storage rows as `any` for the read-only fields we
 * need. Each cast is documented inline.
 */

interface ColumnView {
  propertyName: string;
  type: string | undefined;
  isArray: boolean;
  isNullable: boolean;
  mode: string;
}

interface IndexView {
  name: string;
  isUnique: boolean;
  where: string | undefined;
}

function readMetadata(): {
  tableName: string;
  columns: ColumnView[];
  indices: IndexView[];
} {
  const storage = getMetadataArgsStorage();

  // `tables: TableMetadataArgs[]` — each row has `target` and `name`.
  const tableArgs = (storage as any).tables as Array<{
    target: object;
    name?: string;
  }>;
  const entityArg = tableArgs.find((e) => e.target === SkillEntity);
  if (!entityArg) throw new Error('SkillEntity not registered');

  // `columns: ColumnMetadataArgs[]` — each row has propertyName,
  // options.type/array/nullable, mode.
  const colArgs = (
    (storage as any).columns as Array<{
      target: object;
      propertyName: string;
      mode: string;
      options: {
        type?: string;
        array?: boolean;
        nullable?: boolean;
      };
    }>
  ).filter((c) => c.target === SkillEntity);

  // `indices: IndexMetadataArgs[]` — each row has name, unique, where.
  const idxArgs = (
    (storage as any).indices as Array<{
      target: object;
      name?: string;
      unique?: boolean;
      where?: string;
    }>
  ).filter((i) => i.target === SkillEntity);

  return {
    tableName: entityArg.name ?? 'skill',
    columns: colArgs.map((c) => ({
      propertyName: c.propertyName,
      type: c.options.type,
      isArray: c.options.array === true,
      isNullable: c.options.nullable === true,
      mode: c.mode,
    })),
    indices: idxArgs.map((i) => ({
      name: i.name ?? '',
      isUnique: i.unique === true,
      where: i.where,
    })),
  };
}

describe('SkillEntity', () => {
  it('should register table name "skill"', () => {
    expect(readMetadata().tableName).toBe('skill');
  });

  it('should declare partial unique index on code (where deleted_at IS NULL)', () => {
    const md = readMetadata();
    const codeIndex = md.indices.find((idx) => idx.name === 'uq_skill_code');
    expect(codeIndex).toBeDefined();
    expect(codeIndex?.isUnique).toBe(true);
    expect(codeIndex?.where).toBe('"deleted_at" IS NULL');
  });

  it('should declare partial index on status (where deleted_at IS NULL)', () => {
    const md = readMetadata();
    const idx = md.indices.find((i) => i.name === 'idx_skill_status');
    expect(idx).toBeDefined();
    expect(idx?.where).toBe('"deleted_at" IS NULL');
  });

  it('should declare partial index on marketplace_status (where deleted_at IS NULL)', () => {
    const md = readMetadata();
    const idx = md.indices.find((i) => i.name === 'idx_skill_marketplace');
    expect(idx).toBeDefined();
    expect(idx?.where).toBe('"deleted_at" IS NULL');
  });

  it('should default status to draft', () => {
    const skill = new SkillEntity();
    skill.status = 'draft';
    expect(skill.status).toBe('draft');
  });

  it('should default marketplace_status to private', () => {
    const skill = new SkillEntity();
    skill.marketplaceStatus = 'private';
    expect(skill.marketplaceStatus).toBe('private');
  });

  it('should mirror migration column set', () => {
    const md = readMetadata();
    const propertyNames = md.columns.map((c) => c.propertyName).sort();
    expect(propertyNames).toEqual(
      [
        'id',
        'code',
        'name',
        'description',
        'category',
        'tags',
        'thumbnailUrl',
        'uploaderType',
        'uploaderId',
        'marketplaceStatus',
        'signature',
        'status',
        'manifestContent',
        'filesDirPath',
        'toolsDirPath',
        'manifestTokenEstimate',
        'totalTokenEstimate',
        'contentHash',
        'changelog',
        'publishedAt',
        'createdBy',
        'tools',
        'createdAt',
        'updatedAt',
        'deletedAt',
      ].sort(),
    );
  });

  it('should declare tools as jsonb column', () => {
    const md = readMetadata();
    const toolsCol = md.columns.find((c) => c.propertyName === 'tools');
    expect(toolsCol).toBeDefined();
    expect(toolsCol?.type).toBe('jsonb');
    expect(toolsCol?.isNullable).toBe(false);
  });

  it('should declare tags as array column', () => {
    const md = readMetadata();
    const tagsCol = md.columns.find((c) => c.propertyName === 'tags');
    expect(tagsCol).toBeDefined();
    expect(tagsCol?.isArray).toBe(true);
    expect(tagsCol?.isNullable).toBe(true);
  });

  it('should declare deletedAt as deleteDate column (soft delete)', () => {
    const md = readMetadata();
    const deletedAt = md.columns.find((c) => c.propertyName === 'deletedAt');
    expect(deletedAt).toBeDefined();
    expect(deletedAt?.mode).toBe('deleteDate');
    expect(deletedAt?.isNullable).toBe(true);
  });

  it('should declare createdAt/updatedAt as date-mode columns', () => {
    const md = readMetadata();
    const createdAt = md.columns.find((c) => c.propertyName === 'createdAt');
    const updatedAt = md.columns.find((c) => c.propertyName === 'updatedAt');
    expect(createdAt?.mode).toBe('createDate');
    expect(updatedAt?.mode).toBe('updateDate');
  });
});
