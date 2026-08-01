"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export type ActionState = { error?: string };

export async function addCommentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const expenseId = String(formData.get("expenseId") ?? "");
  const body = String(formData.get("body") ?? "").trim();

  if (!body) return { error: "Escribí algo antes de enviar." };
  if (body.length > 1000) return { error: "El comentario es muy largo." };

  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
    select: { id: true, groupId: true, deletedAt: true },
  });
  if (!expense || expense.deletedAt) return { error: "Ese gasto ya no existe." };

  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: expense.groupId, userId: user.id } },
  });
  if (!membership) return { error: "No sos miembro de este grupo." };

  await prisma.$transaction([
    prisma.comment.create({ data: { expenseId, userId: user.id, body } }),
    prisma.activity.create({
      data: {
        type: "COMMENT_ADDED",
        groupId: expense.groupId,
        actorId: user.id,
        expenseId,
        meta: { preview: body.slice(0, 80) },
      },
    }),
  ]);

  revalidatePath(`/grupos/${expense.groupId}/gastos/${expenseId}`);
  return {};
}

export async function deleteCommentAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const commentId = String(formData.get("commentId") ?? "");

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    include: { expense: { select: { id: true, groupId: true } } },
  });
  if (!comment || comment.deletedAt) return;
  if (comment.userId !== user.id) throw new Error("Sólo podés borrar tus propios comentarios.");

  await prisma.comment.update({ where: { id: commentId }, data: { deletedAt: new Date() } });
  revalidatePath(`/grupos/${comment.expense.groupId}/gastos/${comment.expense.id}`);
}
