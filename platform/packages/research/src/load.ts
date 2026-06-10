// @platform/research — typed loaders. Static JSON imports (no fs at runtime),
// mirroring the @platform/corpus convention: the bundler inlines the corpus.

import corpusData from "../../../../corpus/competitor-research/corpus.json";
import platformsData from "../../../../corpus/competitor-research/platforms.json";
import featureMatrixData from "../../../../corpus/competitor-research/feature-matrix.json";
import taxonomyData from "../../../../corpus/competitor-research/taxonomy.json";
import scoringData from "../../../../corpus/competitor-research/scoring.json";
import schemaData from "../../../../corpus/competitor-research/corpus.schema.json";

import type {
  CorpusItem,
  FeatureMatrixFile,
  PlatformsFile,
  ScoringConfig,
  Taxonomy,
} from "./types";

/** Minimal subset of JSON Schema the validator understands (only what corpus.schema.json uses). */
export interface PropSchema {
  type?: string | string[];
  enum?: Array<string | null>;
  items?: PropSchema;
  minimum?: number;
  maximum?: number;
  pattern?: string;
}

export interface CorpusSchema {
  required: string[];
  properties: Record<string, PropSchema>;
}

export function getCorpus(): CorpusItem[] {
  return corpusData as unknown as CorpusItem[];
}

export function getPlatformsFile(): PlatformsFile {
  return platformsData as unknown as PlatformsFile;
}

export function getPlatforms(): PlatformsFile["platforms"] {
  return getPlatformsFile().platforms;
}

export function getFeatureMatrix(): FeatureMatrixFile {
  return featureMatrixData as unknown as FeatureMatrixFile;
}

export function getTaxonomy(): Taxonomy {
  return taxonomyData as unknown as Taxonomy;
}

export function getScoringConfig(): ScoringConfig {
  return scoringData as unknown as ScoringConfig;
}

export function getCorpusSchema(): CorpusSchema {
  return schemaData as unknown as CorpusSchema;
}
