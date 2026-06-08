import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET;

export const register = async (req, res) => {
  try {
    const { full_name, email, password, phone } = req.body;

    const conditions = [{ email }];
    if (phone) conditions.push({ phone });

    const existingUser = await prisma.users.findFirst({
      where: {
        OR: conditions,
      },
    });

    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(400).json({ message: "Email này đã được đăng ký!" });
      }
      if (phone && existingUser.phone === phone) {
        return res
          .status(400)
          .json({ message: "Số điện thoại này đã được đăng ký!" });
      }
      return res
        .status(400)
        .json({ message: "Email hoặc số điện thoại đã được đăng ký!" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.users.create({
      data: {
        full_name,
        email,
        password: hashedPassword,
        phone,
        role_id: 3,
      },
    });

    res.status(201).json({ message: "Đăng ký tài khoản thành công!" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi hệ thống khi đăng ký." });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.users.findUnique({
      where: { email },
      include: { roles: true }, 
    });

    if (!user)
      return res.status(404).json({ message: "Tài khoản không tồn tại!" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Mật khẩu không chính xác!" });

    const token = jwt.sign(
      { userId: user.id, role: user.roles.role_name },
      JWT_SECRET,
      { expiresIn: "1d" },
    );

    res.status(200).json({
      message: "Đăng nhập thành công!",
      token: token,
      user: {
        full_name: user.full_name,
        role: user.roles.role_name,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi hệ thống khi đăng nhập." });
  }
};

export const createAccount = async (req, res) => {
  try {
    const { full_name, email, password, phone, role_id } = req.body;

    const conditions = [{ email }];
    if (phone) conditions.push({ phone });

    const existingUser = await prisma.users.findFirst({
      where: {
        OR: conditions,
      },
    });

    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(400).json({ message: "Email này đã được đăng ký!" });
      }
      if (phone && existingUser.phone === phone) {
        return res
          .status(400)
          .json({ message: "Số điện thoại này đã được đăng ký!" });
      }
      return res
        .status(400)
        .json({ message: "Email hoặc số điện thoại đã được đăng ký!" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.users.create({
      data: {
        full_name,
        email,
        password: hashedPassword,
        phone,
        role_id ,
      },
    });

    res.status(201).json({ message: "Đăng ký tài khoản thành công!" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi hệ thống khi đăng ký." });
  }
};
