import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    const email = process.env.JM_GATEWAY_ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.JM_GATEWAY_ADMIN_PASSWORD;
    const apiKey = process.env.JM_GATEWAY_API_KEY;
    if (!email || !/^\S+@\S+\.\S+$/.test(email) || !password || password.length < 20
        || !apiKey?.startsWith("wag_") || apiKey.length < 32) {
        throw new Error("Invalid JM Gateway provisioning input");
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const apiKeyHash = createHash("sha256").update(apiKey).digest("hex");
    await prisma.$transaction([
        prisma.user.upsert({
            where: { email },
            create: { email, name: "J&M Cleaning", password: passwordHash, role: "SUPERADMIN",
                plan: "ENTERPRISE", apiKey: apiKeyHash },
            update: { name: "J&M Cleaning", password: passwordHash, role: "SUPERADMIN",
                plan: "ENTERPRISE", planExpiresAt: null, apiKey: apiKeyHash },
        }),
        prisma.systemConfig.upsert({
            where: { id: "default" },
            create: { id: "default", appName: "J&M WhatsApp Gateway", timezone: "Europe/London",
                enableRegistration: false },
            update: { appName: "J&M WhatsApp Gateway", timezone: "Europe/London",
                enableRegistration: false },
        }),
    ]);
    console.log(JSON.stringify({ configured: true, registrationEnabled: false }));
}

main()
    .catch(() => {
        console.error("JM Gateway provisioning failed");
        process.exitCode = 1;
    })
    .finally(async () => prisma.$disconnect());
