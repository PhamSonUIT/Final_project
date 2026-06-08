import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();


export const checkAdminRole = async (req, res, next) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res
        .status(401)
        .json({ message: "Người dùng chưa được xác thực." });
    }

    const user = await prisma.users.findUnique({
      where: { id: userId },
      include: { roles: true },
    });

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng." });
    }

   
    if (
      !user.roles ||
      (user.roles.role_name !== "Admin" && user.roles.role_name !== "admin")
    ) {
      return res.status(403).json({
        message:
          "Bạn không có quyền truy cập",
      });
    }

    next();
  } catch (error) {
    console.error("Lỗi kiểm tra quyền admin:", error);
    return res
      .status(500)
      .json({ message: "Lỗi hệ thống khi kiểm tra quyền." });
  }
};
