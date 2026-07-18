import "dotenv/config";
import { loadAllAgentDefinitions } from "../src/core/agent/loader";
import { type Prisma, PrismaClient } from "../src/generated/prisma";

// Seeds the Agent table from the YAML definition files in `agents/`.
// Definitions-as-files are the source of truth; the DB is a materialized copy.
const prisma = new PrismaClient();

async function main() {
  const definitions = loadAllAgentDefinitions("agents");
  for (const definition of definitions) {
    const data = {
      name: definition.name,
      role: definition.role,
      definition: definition as unknown as Prisma.InputJsonValue,
    };
    await prisma.agent.upsert({
      where: { id: definition.id },
      create: { id: definition.id, ...data },
      update: data,
    });
    console.log(`  seeded agent: ${definition.id}`);
  }
  console.log(`Seeded ${definitions.length} agent(s).`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
