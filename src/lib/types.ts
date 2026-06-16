export interface CustomField {
  key: string;
  label: string;
}

export interface DBSchema {
  dbName: string;
  material: string;
  propertyName: string;
  unit: string;
  categoryLabel: string;
  excludeNote: string;
  customFields: CustomField[];
}

export interface DataEntry {
  id: number;
  materialName: string;
  category: string;
  value: number;
  customValues: Record<string, string>;
  reference: string;
  year: number;
  notes: string;
}

export interface DBProject {
  schema: DBSchema;
  entries: DataEntry[];
}

export const PALETTE = [
  '#3b82f6', '#06b6d4', '#10b981', '#84cc16', '#f59e0b',
  '#f97316', '#ef4444', '#a78bfa', '#34d399', '#fb7185',
  '#c084fc', '#fbbf24', '#e11d48', '#059669', '#7c3aed',
];

export function categoryColor(category: string, allCategories: string[]): string {
  const idx = allCategories.indexOf(category);
  return PALETTE[idx % PALETTE.length] ?? '#64748b';
}
