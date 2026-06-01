import type { QualityChecklistItem, QualityCheckSnapshot } from "@/lib/application-model"

export const DEFAULT_QUALITY_ITEMS = [
  {
    key: "role-fit",
    label: "Role and level are a strong fit.",
    description: "The role scope matches current experience and target level.",
    weight: 25,
  },
  {
    key: "tailored-resume",
    label: "Resume is tailored to the posting.",
    description: "The resume uses language and evidence from this posting.",
    weight: 25,
  },
  {
    key: "skills-reflected",
    label: "Required skills are reflected in the resume.",
    description: "Important skills are represented with real examples.",
    weight: 20,
  },
  {
    key: "referral-checked",
    label: "Referral path has been checked or acted on.",
    description: "A referral route was checked, requested, or ruled out.",
    weight: 15,
  },
  {
    key: "materials-complete",
    label: "Application materials are complete and specific.",
    description: "The submission has tailored notes, cover copy, or answers where needed.",
    weight: 15,
  },
] as const

export function seedQualityChecklist(now = new Date().toISOString()): QualityChecklistItem[] {
  return DEFAULT_QUALITY_ITEMS.map((item, index) => ({
    id: `quality-${item.key}`,
    key: item.key,
    label: item.label,
    description: item.description,
    source: "default",
    weight: item.weight,
    sortOrder: index,
    enabled: true,
    createdAt: now,
    updatedAt: now,
  }))
}

export function getEnabledQualityItems(items: QualityChecklistItem[]) {
  return [...items]
    .filter((item) => item.enabled && item.weight > 0)
    .sort((a, b) => a.sortOrder - b.sortOrder)
}

export function normalizeQualityWeight(
  item: Pick<QualityChecklistItem | QualityCheckSnapshot, "weight">,
  totalWeight: number
) {
  if (totalWeight <= 0) {
    return 0
  }

  return item.weight / totalWeight
}

export function createQualitySnapshot(
  items: QualityChecklistItem[],
  checkedKeys: string[] = []
): QualityCheckSnapshot[] {
  return getEnabledQualityItems(items).map((item) => ({
    key: item.key,
    label: item.label,
    checked: checkedKeys.includes(item.key),
    weight: item.weight,
    source: item.source,
  }))
}

export function calculateQualityScore(checks: QualityCheckSnapshot[]) {
  const enabled = checks.filter((check) => check.weight > 0)
  const totalWeight = enabled.reduce((total, check) => total + check.weight, 0)

  if (totalWeight <= 0) {
    return 0
  }

  const checkedWeight = enabled.reduce(
    (total, check) => total + (check.checked ? check.weight : 0),
    0
  )

  return Math.round((checkedWeight / totalWeight) * 100)
}

export function updateQualitySnapshotCheck(
  checks: QualityCheckSnapshot[],
  key: string,
  checked: boolean
) {
  return checks.map((check) => (check.key === key ? { ...check, checked } : check))
}

export function addCustomQualityItem(
  items: QualityChecklistItem[],
  label: string,
  weight: number,
  now = new Date().toISOString()
) {
  const nextOrder = Math.max(-1, ...items.map((item) => item.sortOrder)) + 1
  const keyBase = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")

  return [
    ...items,
    {
      id: `quality-${keyBase || "custom"}-${Date.now()}`,
      key: `${keyBase || "custom"}-${Date.now()}`,
      label,
      source: "custom" as const,
      weight,
      sortOrder: nextOrder,
      enabled: true,
      createdAt: now,
      updatedAt: now,
    },
  ]
}
