-- AlterTable
ALTER TABLE "api_keys" ADD COLUMN "allowed_origins" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
