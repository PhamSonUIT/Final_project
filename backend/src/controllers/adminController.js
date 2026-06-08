import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();


export const updateVehicleTypePrice = async (req, res) => {
  try {
    const { vehicleTypeId } = req.params;
    const { base_price, overtime_price, monthly_price } = req.body;

    if (!vehicleTypeId || isNaN(vehicleTypeId)) {
      return res.status(400).json({ message: "ID loại xe không hợp lệ!" });
    }

    if (
      !base_price ||
      !overtime_price ||
      Number(base_price) <= 0 ||
      Number(overtime_price) <= 0
    ) {
      return res.status(400).json({
        message: "Giá base_price và overtime_price phải lớn hơn 0!",
      });
    }

    if (monthly_price && Number(monthly_price) < 0) {
      return res.status(400).json({
        message: "Giá monthly_price không được âm!",
      });
    }

    const vehicleType = await prisma.vehicle_types.findUnique({
      where: { id: parseInt(vehicleTypeId) },
    });

    if (!vehicleType) {
      return res.status(404).json({ message: "Không tìm thấy loại xe!" });
    }

    const updatedVehicleType = await prisma.vehicle_types.update({
      where: { id: parseInt(vehicleTypeId) },
      data: {
        base_price: Number(base_price),
        overtime_price: Number(overtime_price),
        monthly_price: monthly_price
          ? Number(monthly_price)
          : vehicleType.monthly_price,
      },
    });

    return res.status(200).json({
      message: `Cập nhật giá cho ${updatedVehicleType.type_name} thành công!`,
      vehicleType: {
        id: updatedVehicleType.id,
        type_name: updatedVehicleType.type_name,
        base_price: updatedVehicleType.base_price,
        overtime_price: updatedVehicleType.overtime_price,
        monthly_price: updatedVehicleType.monthly_price,
      },
    });
  } catch (error) {
    console.error("Lỗi cập nhật giá loại xe:", error);
    return res
      .status(500)
      .json({ message: "Lỗi hệ thống khi cập nhật giá loại xe." });
  }
};

/**
 * Lấy danh sách tất cả loại xe và giá hiện tại
 */
export const getAllVehicleTypes = async (req, res) => {
  try {
    const vehicleTypes = await prisma.vehicle_types.findMany();

    if (vehicleTypes.length === 0) {
      return res.status(200).json({
        message: "Chưa có loại xe nào trong hệ thống.",
        data: [],
      });
    }

    return res.status(200).json({
      message: "Lấy danh sách loại xe thành công!",
      data: vehicleTypes,
    });
  } catch (error) {
    console.error("Lỗi lấy danh sách loại xe:", error);
    return res
      .status(500)
      .json({ message: "Lỗi hệ thống khi lấy danh sách loại xe." });
  }
};

/**
 * Lấy thông tin giá của một loại xe cụ thể
 */
export const getVehicleTypePrice = async (req, res) => {
  try {
    const { vehicleTypeId } = req.params;

    if (!vehicleTypeId || isNaN(vehicleTypeId)) {
      return res.status(400).json({ message: "ID loại xe không hợp lệ!" });
    }

    const vehicleType = await prisma.vehicle_types.findUnique({
      where: { id: parseInt(vehicleTypeId) },
    });

    if (!vehicleType) {
      return res.status(404).json({ message: "Không tìm thấy loại xe!" });
    }

    return res.status(200).json({
      message: "Lấy thông tin giá thành công!",
      vehicleType,
    });
  } catch (error) {
    console.error("Lỗi lấy thông tin giá loại xe:", error);
    return res
      .status(500)
      .json({ message: "Lỗi hệ thống khi lấy thông tin giá loại xe." });
  }
};

/**
 * Cập nhật tất cả giá (Bike và Car) cùng lúc
 * Input: { bikeHourly, carHourly, bikeMonthly, carMonthly }
 */
export const updateAllPrices = async (req, res) => {
  try {
    const { bikeHourly, carHourly, bikeMonthly, carMonthly } = req.body;

    // Validate inputs
    if (
      !bikeHourly ||
      !carHourly ||
      !bikeMonthly ||
      !carMonthly ||
      Number(bikeHourly) <= 0 ||
      Number(carHourly) <= 0 ||
      Number(bikeMonthly) < 0 ||
      Number(carMonthly) < 0
    ) {
      return res.status(400).json({
        message: "Tất cả giá phải được cung cấp và giá lượt phải lớn hơn 0!",
      });
    }

    // Cập nhật Bike (vehicle_type_id = 1)
    const updatedBike = await prisma.vehicle_types.update({
      where: { id: 1 },
      data: {
        base_price: Number(bikeHourly),
        overtime_price: Math.ceil(Number(bikeHourly) / 2), // Tính overtime_price bằng 50% giá base
        monthly_price: Number(bikeMonthly),
      },
    });

    // Cập nhật Car (vehicle_type_id = 2)
    const updatedCar = await prisma.vehicle_types.update({
      where: { id: 2 },
      data: {
        base_price: Number(carHourly),
        overtime_price: Math.ceil(Number(carHourly) / 2), // Tính overtime_price bằng 50% giá base
        monthly_price: Number(carMonthly),
      },
    });

    return res.status(200).json({
      message: "Cập nhật giá tất cả loại xe thành công!",
      data: {
        bike: {
          type_name: updatedBike.type_name,
          base_price: updatedBike.base_price,
          overtime_price: updatedBike.overtime_price,
          monthly_price: updatedBike.monthly_price,
        },
        car: {
          type_name: updatedCar.type_name,
          base_price: updatedCar.base_price,
          overtime_price: updatedCar.overtime_price,
          monthly_price: updatedCar.monthly_price,
        },
      },
    });
  } catch (error) {
    console.error("Lỗi cập nhật tất cả giá:", error);
    return res.status(500).json({ message: "Lỗi hệ thống khi cập nhật giá." });
  }
};

// 1. LẤY DANH SÁCH NHÂN VIÊN
export const getEmployees = async (req, res) => {
  try {
    const employees = await prisma.users.findMany({
      where: { roles: { role_name: { in: ["Admin", "Employee"] } } },
      select: {
        id: true,
        full_name: true,
        email: true,
        phone: true,
        roles: { select: { role_name: true } },
      },
      orderBy: { full_name: "asc" },
    });
    return res.status(200).json(employees);
  } catch (error) {
    console.error("Lỗi lấy danh sách nhân viên:", error);
    return res
      .status(500)
      .json({ message: "Lỗi hệ thống khi tải danh sách nhân viên." });
  }
};

// 2. LẤY DANH SÁCH KHÁCH HÀNG
export const getCustomers = async (req, res) => {
  try {
    const customers = await prisma.users.findMany({
      where: { roles: { role_name: "Customer" } },
      select: {
        id: true,
        full_name: true,
        email: true,
        phone: true,
        created_at: true,
      },
      orderBy: { id: "desc" },
    });
    return res.status(200).json(customers);
  } catch (error) {
    console.error("Lỗi lấy danh sách khách hàng:", error);
    return res
      .status(500)
      .json({ message: "Lỗi hệ thống khi tải danh sách khách hàng." });
  }
};

// 3. QUẢN LÝ XE VÉ THÁNG TOÀN HỆ THỐNG
export const getMonthlyTicketsAdmin = async (req, res) => {
  try {
    const tickets = await prisma.monthly_tickets.findMany({
      include: {
        vehicles: {
          include: { users: { select: { full_name: true, phone: true } } },
        },
      },
      orderBy: { expiry_date: "desc" },
    });

    const formatTickets = tickets.map((t) => ({
      id: t.id,
      plateNumber: t.plate_number,
      ownerName: t.vehicles?.users?.full_name || "Chưa liên kết chủ",
      ownerPhone: t.vehicles?.users?.phone || "",
      expiryDate: t.expiry_date
        ? t.expiry_date.toLocaleDateString("vi-VN")
        : "",
      pricePaid: t.price_paid,
      status: t.status,
    }));

    return res.status(200).json(formatTickets);
  } catch (error) {
    console.error("Lỗi lấy danh sách vé tháng:", error);
    return res
      .status(500)
      .json({ message: "Lỗi hệ thống khi tải danh sách vé tháng toàn bãi." });
  }
};

// 4. QUẢN LÝ XE LƯỢT VÀO RA (TRANSACTIONS)
export const getParkingTransactionsAdmin = async (req, res) => {
  try {
    const transactions = await prisma.transactions.findMany({
      include: { vehicles: true },
      orderBy: { time_in: "desc" },
    });

    const formatTransactions = transactions.map((tx) => ({
      id: tx.id,
      plateNumber: tx.vehicles?.plate_number || "Không rõ",
      timeIn: tx.time_in ? tx.time_in.toLocaleString("vi-VN") : "",
      timeOut: tx.time_out ? tx.time_out.toLocaleString("vi-VN") : "",
      totalAmount: tx.total_amount || 0,
      status: tx.status,
    }));

    return res.status(200).json(formatTransactions);
  } catch (error) {
    console.error("Lỗi lấy danh sách lượt xe:", error);
    return res
      .status(500)
      .json({ message: "Lỗi hệ thống khi tải lịch sử xe lượt." });
  }
};

// 5. THỐNG KÊ DOANH THU & DASHBOARD
export const getRevenueStats = async (req, res) => {
  try {
    const aggregateTransactions = await prisma.transactions.aggregate({
      _sum: { total_amount: true },
    });
    const ticketRevenueCalculated =
      Number(aggregateTransactions._sum.total_amount) || 0;

    const aggregateMonthlyTickets = await prisma.monthly_tickets.aggregate({
      _sum: { price_paid: true },
    });
    const monthlyRevenueCalculated =
      Number(aggregateMonthlyTickets._sum.price_paid) || 0;

    const totalRevenue = ticketRevenueCalculated + monthlyRevenueCalculated;
    const activeMonthlyTicketsCount = await prisma.monthly_tickets.count({
      where: { status: "Active" },
    });
    const currentVehiclesInParking = await prisma.transactions.count({
      where: { status: "In_Park" },
    });

    return res.status(200).json({
      ticketRevenue: ticketRevenueCalculated,
      monthlyRevenue: monthlyRevenueCalculated,
      totalRevenue: totalRevenue,
      activeMonthlyTickets: activeMonthlyTicketsCount,
      currentInParking: currentVehiclesInParking,
      message: "Tổng hợp dữ liệu doanh thu bãi đỗ xe thành công.",
    });
  } catch (error) {
    console.error("Lỗi tổng hợp báo cáo doanh thu:", error);
    return res
      .status(500)
      .json({ message: "Lỗi hệ thống khi phân tích doanh thu." });
  }
};
