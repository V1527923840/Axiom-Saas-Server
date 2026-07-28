// src/industry-chain/domain/industry-chain.ts

export interface L1Item {
  code: string;
  name: string;
  chainCount: number;
}

export interface L2Item {
  code: string;
  name: string;
  chainCount: number;
}

export interface ChainItem {
  slug: string;
  name: string;
  createTime: Date;
  versionCount: number;
}

export interface VersionItem {
  id: number;
  version: number;
  createTime: Date;
  qiniuUrl: string;
}
