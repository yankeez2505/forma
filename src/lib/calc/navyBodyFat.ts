import type { Sex } from "@/lib/schema"

export interface NavyInput {
  sex: Sex
  heightCm: number
  waistCm: number
  neckCm: number
  hipCm?: number
}

/** US Navy circumference method, % body fat with 1 decimal; null when the formula is undefined for the inputs */
export function navyBodyFat({ sex, heightCm, waistCm, neckCm, hipCm }: NavyInput): number | null {
  if (heightCm <= 0) return null
  let denominator: number
  if (sex === "male") {
    const girth = waistCm - neckCm
    if (girth <= 0) return null
    denominator = 1.0324 - 0.19077 * Math.log10(girth) + 0.15456 * Math.log10(heightCm)
  } else {
    if (hipCm === undefined) return null
    const girth = waistCm + hipCm - neckCm
    if (girth <= 0) return null
    denominator = 1.29579 - 0.35004 * Math.log10(girth) + 0.221 * Math.log10(heightCm)
  }
  return Math.round((495 / denominator - 450) * 10) / 10
}
