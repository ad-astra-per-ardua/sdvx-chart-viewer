export type Difficulty =
  | "NOV" | "ADV" | "EXH" | "MXM"
  | "INF" | "GRV" | "HVN" | "VVD" | "XCD" | "ULT" | "NBL";

export interface Chart {
  id: number;
  difficulty: Difficulty;
  level: number;
  jacket_url?: string;
  tags: Tag[];
}

export type ChartPart = "intro" | "outro" | "main" | "alt";

export interface ChartImage {
  id: number;
  image_url: string;
  order_idx: number;
  part: ChartPart;
}

export interface Tag {
  id: number;
  name: string;
}

export interface Song {
  id: number;
  title: string;
  artist: string;
  keywords: string;
  jacket_url: string;
  created_at: string;
  charts: Chart[];
}

export interface SongAdmin extends Song {}

export interface ChartDetailDto {
  id: number;
  difficulty: Difficulty;
  level: number;
  jacket_url?: string;
  song: Song;
  images: ChartImage[];
  tags: Tag[];
}

export interface FilterMeta {
  difficulties: Difficulty[];
  tags: string[];
  level_min: number;
  level_max: number;
}

export interface SongQuery {
  level_min: number;
  level_max: number;
  difficulties: Difficulty[];
  tags: string[];
  quick_level?: number;
  sort: "new" | "level_asc" | "level_desc";
  q?: string;
  limit?: number;
}
