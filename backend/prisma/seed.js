import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
const prisma = new PrismaClient();

const pass = "12345";
const hashPass = bcrypt.hashSync(pass, 10);
async function main() {
  const adminRole = await prisma.roles.create({ data: { role_name: "Admin" } });
  const employeeRole = await prisma.roles.create({ data: { role_name: "Employee" } });
  await prisma.roles.create({ data: { role_name: "Customer" } });

  await prisma.users.create({
    data: {
      full_name: "Super Admin",
      email: "admin@gmail.com",
      password: hashPass,
      role_id: adminRole.id,
    },
  });

  await prisma.users.create({
    data: {
      full_name: "Employee",
      email: "employee@gmail.com",
      password: hashPass,
      role_id: employeeRole.id,
    },
  });
}
main();