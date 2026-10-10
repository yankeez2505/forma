import foodsJson from "@/content/foods.json"
import menusJson from "@/content/menus.json"

export type FoodCategory = "dairy" | "eggs" | "meat" | "fish" | "grain" | "bread" | "legume" | "vegetable" | "fruit" | "fat" | "other"

export const CATEGORY_ORDER: FoodCategory[] = ["dairy", "eggs", "meat", "fish", "grain", "bread", "legume", "vegetable", "fruit", "fat", "other"]

export const CATEGORY_RU: Record<FoodCategory, string> = {
  dairy: "Молочное",
  eggs: "Яйца",
  meat: "Мясо и птица",
  fish: "Рыба и морепродукты",
  grain: "Крупы и макароны",
  bread: "Хлеб",
  legume: "Бобовые",
  vegetable: "Овощи и зелень",
  fruit: "Фрукты и ягоды",
  fat: "Масла, орехи, семена",
  other: "Прочее",
}

export interface Macros {
  kcal: number
  protein: number
  fat: number
  carbs: number
}

export interface Food {
  id: string
  name: string
  category: FoodCategory
  countries: string[]
  per100: Macros
  unit?: { name: string; grams: number }
}

export type MenuGoal = "deficit" | "maintenance" | "surplus"
export type MenuItem = [foodId: string, grams: number]

export interface Meal {
  name: string
  items: MenuItem[]
}

export interface MenuDay {
  meals: Meal[]
}

export interface Menu {
  id: MenuGoal
  title: string
  baseKcal: number
  days: MenuDay[]
}

export const foods = foodsJson as Food[]
export const foodById = new Map(foods.map((f) => [f.id, f] as const))

export const menus = menusJson as Menu[]
export const menuById = Object.fromEntries(menus.map((m) => [m.id, m])) as Record<MenuGoal, Menu>

export const foodsFor = (country: string): Food[] => foods.filter((f) => f.countries.includes(country))
