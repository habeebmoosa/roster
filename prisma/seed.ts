import "dotenv/config";
import { loadAllAgentDefinitions } from "../src/core/agent/loader";
import { loadAllMcpServerDefinitions } from "../src/core/mcp/directory-loader";
import { type Prisma, PrismaClient } from "../src/generated/prisma";

// Seeds the Agent table from the YAML definition files in `agents/`, and the
// McpServer table from the curated directory in `mcp-servers/`.
// Definitions-as-files are the source of truth; the DB is a materialized copy.
const prisma = new PrismaClient();

async function seedAgents() {
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

async function seedMcpServers() {
  const definitions = loadAllMcpServerDefinitions("mcp-servers");
  for (const definition of definitions) {
    const data = {
      name: definition.name,
      description: definition.description,
      iconUrl: definition.iconUrl ?? null,
      developer: definition.developer ?? null,
      connectorUrl: definition.connectorUrl,
      authType: definition.authType,
      categories: definition.categories,
      trustTier: definition.trustTier,
      cachedTools: definition.tools as unknown as Prisma.InputJsonValue,
      cachedResources: definition.resources as unknown as Prisma.InputJsonValue,
      documentationUrl: definition.documentationUrl ?? null,
      supportUrl: definition.supportUrl ?? null,
      privacyPolicyUrl: definition.privacyPolicyUrl ?? null,
    };
    await prisma.mcpServer.upsert({
      where: { id: definition.id },
      create: { id: definition.id, ...data },
      update: data,
    });
    console.log(`  seeded MCP server: ${definition.id}`);
  }
  console.log(`Seeded ${definitions.length} MCP server(s).`);
}

async function main() {
  await seedAgents();
  await seedMcpServers();
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
