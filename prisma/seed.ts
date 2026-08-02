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
    payAlias: "emiliano.vaquita.mp",
  },
  { name: "Sofía Ruiz", email: "sofia@ejemplo.com", isAdmin: false, payAlias: "sofiaruiz.mp" },
  { name: "Martín Paz", email: "martin@ejemplo.com", isAdmin: false, payAlias: "0000003100010000000001" },
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
      name: "Depto Palermo",
      emoji: "🏠",
      currency: "ARS",
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

  // -------------------------------------------------------- grupo Bariloche
  const viaje = await prisma.group.create({
    data: {
      name: "Bariloche 2026",
      emoji: "🏔️",
      currency: "ARS",
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

  // ---------------------------------------------------------- grupo asados
  const asados = await prisma.group.create({
    data: {
      name: "Los asados",
      emoji: "🍻",
      currency: "ARS",
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

  const groupIds: Record<string, string> = { depto: depto.id, viaje: viaje.id, asados: asados.id };
  const currencyOf: Record<string, string> = { depto: "ARS", viaje: "ARS", asados: "ARS" };

  const seeds: Seed[] = [
    // Depto
    { group: "depto", description: "Alquiler de agosto", amount: 890_000, category: "alquiler", daysAgo: 28, payer: emi.id, among: [emi.id, sofia.id, martin.id] },
    { group: "depto", description: "Expensas", amount: 145_500, category: "servicios", daysAgo: 27, payer: sofia.id, among: [emi.id, sofia.id, martin.id] },
    { group: "depto", description: "Internet Fibertel", amount: 38_900, category: "servicios", daysAgo: 24, payer: martin.id, among: [emi.id, sofia.id, martin.id] },
    { group: "depto", description: "Súper de la semana", amount: 96_340, category: "super", daysAgo: 18, payer: sofia.id, among: [emi.id, sofia.id, martin.id] },
    { group: "depto", description: "Luz y gas", amount: 62_180, category: "servicios", daysAgo: 12, payer: emi.id, among: [emi.id, sofia.id, martin.id] },
    { group: "depto", description: "Cosas de limpieza", amount: 27_450, category: "compras", daysAgo: 6, payer: martin.id, among: [emi.id, sofia.id, martin.id] },
    { group: "depto", description: "Súper de la semana", amount: 88_200, category: "super", daysAgo: 3, payer: emi.id, among: [emi.id, sofia.id, martin.id] },

    // Bariloche
    { group: "viaje", description: "Cabaña 4 noches", amount: 1_240_000, category: "alojamiento", daysAgo: 45, payer: sofia.id, among: [sofia.id, emi.id, lucia.id, nico.id], notes: "Seña pagada en junio, resto al llegar." },
    { group: "viaje", description: "Pasajes de micro", amount: 520_000, category: "transporte", daysAgo: 44, payer: emi.id, among: [sofia.id, emi.id, lucia.id, nico.id] },
    { group: "viaje", description: "Alquiler de auto", amount: 310_000, category: "transporte", daysAgo: 40, payer: nico.id, among: [sofia.id, emi.id, lucia.id, nico.id] },
    { group: "viaje", description: "Súper para la cabaña", amount: 187_600, category: "super", daysAgo: 39, payer: lucia.id, among: [sofia.id, emi.id, lucia.id, nico.id] },
    { group: "viaje", description: "Cena en El Boliche de Alberto", amount: 164_800, category: "comida", daysAgo: 38, payer: emi.id, among: [sofia.id, emi.id, lucia.id, nico.id] },
    { group: "viaje", description: "Pases de esquí", amount: 940_000, category: "entretenimiento", daysAgo: 37, payer: sofia.id, among: [sofia.id, emi.id, nico.id], notes: "Lucía no esquió." },
    { group: "viaje", description: "Nafta", amount: 78_300, category: "transporte", daysAgo: 36, payer: nico.id, among: [sofia.id, emi.id, lucia.id, nico.id] },

    // Asados
    { group: "asados", description: "Carne y achuras", amount: 142_000, category: "comida", daysAgo: 21, payer: martin.id, among: [martin.id, emi.id, nico.id, lucia.id] },
    { group: "asados", description: "Bebidas y hielo", amount: 58_400, category: "salidas", daysAgo: 21, payer: emi.id, among: [martin.id, emi.id, nico.id, lucia.id] },
    { group: "asados", description: "Asado de despedida", amount: 196_500, category: "comida", daysAgo: 9, payer: nico.id, among: [martin.id, emi.id, nico.id, lucia.id], splitType: "SHARES", weights: [2, 1, 2, 1], notes: "Martín y Nico vinieron con la familia." },
    { group: "asados", description: "Postre y café", amount: 34_900, category: "comida", daysAgo: 9, payer: lucia.id, among: [martin.id, emi.id, nico.id, lucia.id] },
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
    { groupId: depto.id, from: martin.id, to: emi.id, amount: 210_000, daysAgo: 10 },
    { groupId: viaje.id, from: lucia.id, to: sofia.id, amount: 400_000, daysAgo: 20, note: "Transferencia" },
    { groupId: viaje.id, from: emi.id, to: sofia.id, amount: 150_000, daysAgo: 5, note: "MercadoPago" },
  ];

  for (const s of settlements) {
    const settlement = await prisma.settlement.create({
      data: {
        groupId: s.groupId,
        fromUserId: s.from,
        toUserId: s.to,
        amountCents: BigInt(s.amount) * 100n,
        currency: "ARS",
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
          currency: "ARS",
        },
      },
    });
  }

  console.log("Creando comentarios…");
  const alquiler = await prisma.expense.findFirstOrThrow({
    where: { groupId: depto.id, description: "Alquiler de agosto" },
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
