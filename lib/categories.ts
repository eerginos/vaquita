export type Category = {
  id: string;
  label: string;
  emoji: string;
};

export const CATEGORIES: Category[] = [
  { id: "comida", label: "Comida y bebida", emoji: "🍕" },
  { id: "super", label: "Supermercado", emoji: "🛒" },
  { id: "salidas", label: "Salidas", emoji: "🍻" },
  { id: "transporte", label: "Transporte", emoji: "🚕" },
  { id: "alojamiento", label: "Alojamiento", emoji: "🏨" },
  { id: "viaje", label: "Viaje", emoji: "✈️" },
  { id: "alquiler", label: "Alquiler", emoji: "🏠" },
  { id: "servicios", label: "Servicios", emoji: "💡" },
  { id: "compras", label: "Compras", emoji: "🛍️" },
  { id: "salud", label: "Salud", emoji: "💊" },
  { id: "regalos", label: "Regalos", emoji: "🎁" },
  { id: "entretenimiento", label: "Entretenimiento", emoji: "🎬" },
  { id: "otros", label: "Otros", emoji: "📌" },
];

const BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]));

export function getCategory(id: string | null | undefined): Category {
  return (id && BY_ID.get(id)) || BY_ID.get("otros")!;
}

export const GROUP_EMOJIS = [
  "👥", "🏠", "✈️", "🍻", "🏖️", "🎉", "🚗", "⚽", "🎓", "🏔️", "🍕", "🎸",
];
