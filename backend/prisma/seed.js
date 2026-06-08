import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const adminRole = await prisma.roles.create({ data: { role_name: "Admin" } });
  const employeeRole = await prisma.roles.create({ data: { role_name: "Employee" } });
  await prisma.roles.create({ data: { role_name: "Customer" } });

  await prisma.users.create({
    data: {
      full_name: "Super Admin",
      email: "admin@gmail.com",
      password: "12345",
      role_id: adminRole.id,
    },
  });

  await prisma.users.create({
    data: {
      full_name: "Employee",
      email: "employee@gmail.com",
      password: "12345",
      role_id: employeeRole.id,
    },
  });
}
main();