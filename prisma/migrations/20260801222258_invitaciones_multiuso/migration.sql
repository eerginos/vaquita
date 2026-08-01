-- AlterTable
ALTER TABLE "Invitation" ADD COLUMN     "maxUses" INTEGER DEFAULT 1,
ADD COLUMN     "useCount" INTEGER NOT NULL DEFAULT 0;

-- Las invitaciones que ya se habian usado quedan con useCount = 1, si no
-- volverian a ser validas al pasar a contarse por cantidad de usos.
UPDATE "Invitation" SET "useCount" = 1 WHERE "usedAt" IS NOT NULL;
