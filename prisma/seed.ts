/**
 * Datos de ejemplo para probar la app en local.
 *   npm run db:seed
 *
 * Borra y recrea todo. NO correr contra la base de producción.
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../lib/generated/prisma/client";
import { allocateByWeights, splitEvenly } from "../lib/money";
import { colorForSeed } from "../lib/colors";
import { emojiForSeed } from "../lib/emojis";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const PASSWORD = "vaquita1234";

const PEOPLE = [
  {
    name: "Emiliano",
    email: process.env.BOOTSTRAP_ADMIN_EMAIL || "emi@ejemplo.com",
    isAdmin: true,
    payAlias: "emiliano.pagos",
  },
  { name: "Sofía Ruiz", email: "sofia@ejemplo.com", isAdmin: false, payAlias: "sofia.ruiz" },
  { name: "Martín Paz", email: "martin@ejemplo.com", isAdmin: false, payAlias: "1234 5678 9012 3456 7890" },
  { name: "Lucía Fernández", email: "lucia@ejemplo.com", isAdmin: false, payAlias: "luchi.fernandez" },
  { name: "Nico Álvarez", email: "nico@ejemplo.com", isAdmin: false, payAlias: null },
];

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(12, 0, 0, 0);
  return d;
}

async function main() {
  console.log("Limpiando la base…");
  await prisma.activity.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.expenseShare.deleteMany();
  await prisma.expensePayer.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.settlement.deleteMany();
  await prisma.invitation.deleteMany();
  await prisma.passwordReset.deleteMany();
  await prisma.groupMember.deleteMany();
  await prisma.group.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  console.log("Creando personas…");
  const users = await Promise.all(
    PEOPLE.map((p) =>
      prisma.user.create({
        data: {
          name: p.name,
          email: p.email.toLowerCase(),
          passwordHash,
          isAdmin: p.isAdmin,
          color: colorForSeed(p.email),
          emoji: emojiForSeed(p.email),
          payAlias: p.payAlias,
        },
      }),
    ),
  );

  const [emi, sofia, martin, lucia, nico] = users;

  // ------------------------------------------------------------- grupo depto
  const depto = await prisma.group.create({
    data: {
      name: "Depto compartido",
      emoji: "🏠",
      currency: "EUR",
      simplifyDebts: true,
      createdById: emi.id,
      members: {
        create: [
          { userId: emi.id, role: "OWNER" },
          { userId: sofia.id },
          { userId: martin.id },
        ],
      },
    },
  });

  // ----------------------------------------------------------- grupo viaje
  const viaje = await prisma.group.create({
    data: {
      name: "Viaje a la montaña",
      emoji: "🏔️",
      currency: "EUR",
      simplifyDebts: true,
      createdById: sofia.id,
      members: {
        create: [
          { userId: sofia.id, role: "OWNER" },
          { userId: emi.id },
          { userId: lucia.id },
          { userId: nico.id },
        ],
      },
    },
  });

  // -------------------------------------------------------- grupo juntadas
  const juntadas = await prisma.group.create({
    data: {
      name: "Las juntadas",
      emoji: "🍻",
      currency: "EUR",
      simplifyDebts: false,
      createdById: martin.id,
      members: {
        create: [
          { userId: martin.id, role: "OWNER" },
          { userId: emi.id },
          { userId: nico.id },
          { userId: lucia.id },
        ],
      },
    },
  });

  type Seed = {
    group: string;
    description: string;
    amount: number; // en unidades enteras de la moneda
    category: string;
    daysAgo: number;
    payer: string;
    among: string[];
    splitType?: "EQUAL" | "SHARES";
    weights?: number[];
    notes?: string;
  };

  const groupIds: Record<string, string> = { depto: depto.id, viaje: viaje.id, juntadas: juntadas.id };
  const currencyOf: Record<string, string> = { depto: "EUR", viaje: "EUR", juntadas: "EUR" };

  const seeds: Seed[] = [
    // Depto
    { group: "depto", description: "Alquiler del mes", amount: 1_200, category: "alquiler", daysAgo: 28, payer: emi.id, among: [emi.id, sofia.id, martin.id] },
    { group: "depto", description: "Gastos del edificio", amount: 180, category: "servicios", daysAgo: 27, payer: sofia.id, among: [emi.id, sofia.id, martin.id] },
    { group: "depto", description: "Internet", amount: 45, category: "servicios", daysAgo: 24, payer: martin.id, among: [emi.id, sofia.id, martin.id] },
    { group: "depto", description: "Súper de la semana", amount: 120, category: "super", daysAgo: 18, payer: sofia.id, among: [emi.id, sofia.id, martin.id] },
    { group: "depto", description: "Luz y gas", amount: 85, category: "servicios", daysAgo: 12, payer: emi.id, among: [emi.id, sofia.id, martin.id] },
    { group: "depto", description: "Cosas de limpieza", amount: 32, category: "compras", daysAgo: 6, payer: martin.id, among: [emi.id, sofia.id, martin.id] },
    { group: "depto", description: "Súper de la semana", amount: 96, category: "super", daysAgo: 3, payer: emi.id, among: [emi.id, sofia.id, martin.id] },

    // Viaje
    { group: "viaje", description: "Casa 4 noches", amount: 960, category: "alojamiento", daysAgo: 45, payer: sofia.id, among: [sofia.id, emi.id, lucia.id, nico.id], notes: "Seña pagada en junio, resto al llegar." },
    { group: "viaje", description: "Pasajes de tren", amount: 420, category: "transporte", daysAgo: 44, payer: emi.id, among: [sofia.id, emi.id, lucia.id, nico.id] },
    { group: "viaje", description: "Alquiler de auto", amount: 260, category: "transporte", daysAgo: 40, payer: nico.id, among: [sofia.id, emi.id, lucia.id, nico.id] },
    { group: "viaje", description: "Súper para la casa", amount: 145, category: "super", daysAgo: 39, payer: lucia.id, among: [sofia.id, emi.id, lucia.id, nico.id] },
    { group: "viaje", description: "Cena del sábado", amount: 128, category: "comida", daysAgo: 38, payer: emi.id, among: [sofia.id, emi.id, lucia.id, nico.id] },
    { group: "viaje", description: "Pases de esquí", amount: 720, category: "entretenimiento", daysAgo: 37, payer: sofia.id, among: [sofia.id, emi.id, nico.id], notes: "Lucía no esquió." },
    { group: "viaje", description: "Combustible", amount: 62, category: "transporte", daysAgo: 36, payer: nico.id, among: [sofia.id, emi.id, lucia.id, nico.id] },

    // Juntadas
    { group: "juntadas", description: "Compras para la cena", amount: 110, category: "comida", daysAgo: 21, payer: martin.id, among: [martin.id, emi.id, nico.id, lucia.id] },
    { group: "juntadas", description: "Bebidas y hielo", amount: 45, category: "salidas", daysAgo: 21, payer: emi.id, among: [martin.id, emi.id, nico.id, lucia.id] },
    { group: "juntadas", description: "Cena de despedida", amount: 152, category: "comida", daysAgo: 9, payer: nico.id, among: [martin.id, emi.id, nico.id, lucia.id], splitType: "SHARES", weights: [2, 1, 2, 1], notes: "Martín y Nico vinieron con la familia." },
    { group: "juntadas", description: "Postre y café", amount: 27, category: "comida", daysAgo: 9, payer: lucia.id, among: [martin.id, emi.id, nico.id, lucia.id] },
  ];

  console.log(`Creando ${seeds.length} gastos…`);
  for (const seed of seeds) {
    const groupId = groupIds[seed.group];
    const amountCents = BigInt(seed.amount) * 100n;
    const splitType = seed.splitType ?? "EQUAL";

    const amounts =
      splitType === "SHARES" && seed.weights
        ? allocateByWeights(amountCents, seed.weights)
        : splitEvenly(amountCents, seed.among.length);

    const expense = await prisma.expense.create({
      data: {
        groupId,
        description: seed.description,
        amountCents,
        currency: currencyOf[seed.group],
        date: daysAgo(seed.daysAgo),
        category: seed.category,
        notes: seed.notes ?? null,
        splitType,
        createdById: seed.payer,
        payers: { create: [{ userId: seed.payer, amountCents }] },
        shares: {
          create: seed.among.map((userId, i) => ({
            userId,
            amountCents: amounts[i],
            weight: splitType === "SHARES" && seed.weights ? seed.weights[i] : null,
          })),
        },
      },
    });

    await prisma.activity.create({
      data: {
        type: "EXPENSE_CREATED",
        groupId,
        actorId: seed.payer,
        expenseId: expense.id,
        createdAt: daysAgo(seed.daysAgo),
        meta: {
          description: seed.description,
          amountCents: amountCents.toString(),
          currency: currencyOf[seed.group],
        },
      },
    });
  }

  console.log("Creando pagos…");
  const settlements = [
    { groupId: depto.id, from: martin.id, to: emi.id, amount: 165, daysAgo: 10 },
    { groupId: viaje.id, from: lucia.id, to: sofia.id, amount: 310, daysAgo: 20, note: "Transferencia" },
    { groupId: viaje.id, from: emi.id, to: sofia.id, amount: 120, daysAgo: 5, note: "En efectivo" },
  ];

  for (const s of settlements) {
    const settlement = await prisma.settlement.create({
      data: {
        groupId: s.groupId,
        fromUserId: s.from,
        toUserId: s.to,
        amountCents: BigInt(s.amount) * 100n,
        currency: "EUR",
        date: daysAgo(s.daysAgo),
        note: s.note ?? null,
        createdById: s.from,
      },
      include: { from: { select: { name: true } }, to: { select: { name: true } } },
    });

    await prisma.activity.create({
      data: {
        type: "SETTLEMENT_CREATED",
        groupId: s.groupId,
        actorId: s.from,
        settlementId: settlement.id,
        createdAt: daysAgo(s.daysAgo),
        meta: {
          fromName: settlement.from.name,
          toName: settlement.to.name,
          amountCents: settlement.amountCents.toString(),
          currency: "EUR",
        },
      },
    });
  }

  console.log("Creando comentarios…");
  const alquiler = await prisma.expense.findFirstOrThrow({
    where: { groupId: depto.id, description: "Alquiler del mes" },
  });
  await prisma.comment.createMany({
    data: [
      { expenseId: alquiler.id, userId: sofia.id, body: "Ya te transferí mi parte 👍" },
      { expenseId: alquiler.id, userId: martin.id, body: "Yo la semana que viene, quedate tranquilo." },
    ],
  });

  console.log("\n✅ Listo.");
  console.log(`   Entrá con: ${users[0].email}`);
  console.log(`   Contraseña: ${PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
