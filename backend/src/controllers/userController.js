import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import { PayOS } from "@payos/node";
import { sendOTPEmail, verifyOTP } from "../utils/sendMail.js";

dotenv.config();
const prisma = new PrismaClient();

const payos = new PayOS(
  process.env.PAYOS_CLIENT_ID,
  process.env.PAYOS_API_KEY,
  process.env.PAYOS_CHECKSUM_KEY,
);

const detectTypeFromPlateText = (plate) => {
  const cleanPlate = plate.replace(/[\s\.\-]/g, "").toUpperCase();
  if (cleanPlate.length < 4) return "Motorbike";

  if (cleanPlate.length === 9) {
    const char3 = cleanPlate.charAt(2);
    const char4 = cleanPlate.charAt(3);
    if (/[A-Z]/.test(char3) && /[0-9]/.test(char4)) return "Motorbike";
    if (/[A-Z]/.test(char3) && /[A-Z]/.test(char4)) return "Motorbike";
    return "Car";
  }

  if (cleanPlate.length === 7) return "Car";

  if (cleanPlate.length === 8) {
    const char3 = cleanPlate.charAt(2);
    const char4 = cleanPlate.charAt(3);

    if (/[A-Z]/.test(char3) && /[A-Z]/.test(char4)) return "Motorbike";

    if (/[A-Z]/.test(char3) && /[0-9]/.test(char4)) {
      const totalNumbers = cleanPlate.replace(/[^0-9]/g, "").length;
      if (totalNumbers === 7) return "Car";
      return "Motorbike";
    }
  }

  return "Motorbike";
};

export const registerMonthlyTicket = async (req, res) => {
  try {
    const { plateNumber, vehicleType, durationMonths, isPayOS } = req.body;
    const userId = req.userId;

    if (!userId) {
      return res
        .status(401)
        .json({ message: "Vui lòng đăng nhập để đăng kí vé tháng" });
    }

    if (!plateNumber) {
      return res
        .status(400)
        .json({ message: "Vui lòng nhập biển số xe đăng ký vé tháng!" });
    }

    const months = durationMonths ? parseInt(durationMonths) : 1;
    if (months <= 0) {
      return res
        .status(400)
        .json({ message: "Số tháng đăng ký không hợp lệ!" });
    }

    const cleanPlate = plateNumber.replace(/[\s\.\-]/g, "").toUpperCase();

    const autoDetectedType = detectTypeFromPlateText(cleanPlate);

    if (autoDetectedType.toLowerCase() !== vehicleType.toLowerCase()) {
      const requiredLabel =
        autoDetectedType === "Car" ? "Ô tô (Car)" : "Xe máy (Motorbike)";
      return res.status(400).json({
        message: `CHỌN SAI LOẠI XE: Định dạng biển số [${cleanPlate}] được hệ thống nhận diện là [${requiredLabel}]. Vui lòng chọn đúng loại phương tiện `,
      });
    }
    const typeData = await prisma.vehicle_types.findFirst({
      where: { type_name: vehicleType },
    });
    if (!typeData) {
      return res
        .status(404)
        .json({ message: "Loại xe lựa chọn không hợp lệ!" });
    }

    const currentUser = await prisma.users.findUnique({
      where: { id: userId },
    });

    let vehicle = await prisma.vehicles.findUnique({
      where: { plate_number: cleanPlate },
    });
    if (!vehicle) {
      vehicle = await prisma.vehicles.create({
        data: {
          plate_number: cleanPlate,
          vehicle_types: {
            connect: { id: typeData.id },
          },
          users: {
            connect: { id: userId },
          },
          owner_email: currentUser?.email || null,
        },
      });
    } else {
      vehicle = await prisma.vehicles.update({
        where: { id: vehicle.id },
        data: {
          users: {
            connect: { id: userId },
          },
          owner_email: currentUser?.email || vehicle.owner_email,
        },
      });
    }

    const existingTicket = await prisma.monthly_tickets.findFirst({
      where: {
        vehicle_id: vehicle.id,
        status: "Active",
        expiry_date: { gte: new Date() },
      },
      orderBy: { expiry_date: "desc" },
    });

    let expiryDate = new Date();
    if (existingTicket) {
      expiryDate = new Date(existingTicket.expiry_date);
    }
    expiryDate.setDate(expiryDate.getDate() + months * 30);

    const monthlyPricePerMonth = Number(typeData.monthly_price);
    let totalTicketPrice =
      monthlyPricePerMonth > 0
        ? monthlyPricePerMonth * months
        : (vehicleType === "Car" ? 1000000 : 100000) * months;

    const finalStatus = isPayOS ? "Active" : "Pending";

    if (isPayOS && existingTicket) {
      await prisma.monthly_tickets.update({
        where: { id: existingTicket.id },
        data: { status: "Expired" },
      });
    }

    const newTicket = await prisma.monthly_tickets.create({
      data: {
        vehicles: {
          connect: { id: vehicle.id },
        },
        user: {
          connect: { id: userId },
        },
        plate_number: cleanPlate,
        expiry_date: expiryDate,
        price_paid: totalTicketPrice,
        status: finalStatus,
      },
    });

    return res.status(201).json({
      message: isPayOS
        ? "Kích hoạt Vé Tháng thành công!"
        : "Khởi tạo đơn đăng ký vé tháng thành công. Trạng thái: Pending.",
      ticketDetails: {
        plateNumber: cleanPlate,
        durationMonths: months,
        pricePaid: totalTicketPrice,
        status: newTicket.status,
      },
    });
  } catch (error) {
    console.error("Lỗi đăng ký vé tháng:", error);
    return res
      .status(500)
      .json({ message: "Lỗi hệ thống khi đăng ký vé tháng." });
  }
};

export const handlePayOSCallback = async (req, res) => {
  try {
    const status = req.body.status || req.query.status;
    const orderCode = req.body.orderCode || req.query.orderCode;
    const userId = req.userId;

    console.log(
      `[PAYOS PROCESS] Đang xử lý đơn hàng #${orderCode} - Trạng thái: ${status}`,
    );

    if (status === "CANCELLED" || status === "cancel") {
      const pendingTicket = await prisma.monthly_tickets.findFirst({
        where: {
          status: "Pending",
          ...(userId ? { user_id: userId } : {}),
        },
        orderBy: { id: "desc" },
      });

      if (pendingTicket) {
        await prisma.monthly_tickets.delete({
          where: { id: pendingTicket.id },
        });
        console.log(
          `[HỆ THỐNG] Đã XÓA bản ghi Pending rác (ID: ${pendingTicket.id}) do người dùng hủy đơn.`,
        );
        return res.status(200).json({
          success: true,
          message: "🗑️ Đã hủy đăng ký và xóa dữ liệu chờ thành công.",
        });
      }
      return res
        .status(200)
        .json({ success: true, message: "Không có vé pending nào cần xóa." });
    }

    if (status === "PAID" || status === "success") {
      const pendingTicket = await prisma.monthly_tickets.findFirst({
        where: {
          status: "Pending",
          ...(userId ? { user_id: userId } : {}),
        },
        orderBy: { id: "desc" },
        include: { vehicles: true },
      });

      if (pendingTicket) {
        if (pendingTicket.vehicles?.id) {
          await prisma.monthly_tickets.updateMany({
            where: {
              vehicle_id: pendingTicket.vehicles.id,
              status: "Active",
            },
            data: { status: "Expired" },
          });
        }

        await prisma.monthly_tickets.update({
          where: { id: pendingTicket.id },
          data: { status: "Active" },
        });

        console.log(
          `Kích hoạt thành công trạng thái ACTIVE cho vé ID: ${pendingTicket.id}`,
        );
        return res.status(200).json({
          success: true,
          message: "Vé tháng đã được kích hoạt thành công!",
        });
      }
    }

    return res
      .status(200)
      .json({ message: "Không nằm trong diện xử lý trạng thái." });
  } catch (error) {
    console.error("Lỗi xử lý đối soát vé tháng:", error);
    return res
      .status(500)
      .json({ message: "Lỗi hệ thống xử lý trạng thái vé." });
  }
};

export const createPayOSCheckout = async (req, res) => {
  try {
    const { amount, description } = req.body;
    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ message: "Số tiền không hợp lệ!" });
    }
    const orderCode = Math.floor(Math.random() * 900000) + 100000;
    const returnUrl = `http://134.209.210.226:3001/profile?status=success&orderCode=${orderCode}`;
    const cancelUrl = `http://134.209.210.226:3001/profile?status=cancel&orderCode=${orderCode}`;

    const cleanDescription = (description || "Thanh toan ve thang")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[đĐ]/g, "d")
      .replace(/[^a-zA-Z0-9 ]/g, "")
      .substring(0, 25);

    const paymentBody = {
      orderCode: orderCode,
      amount: Number(Number(amount).toFixed(0)),
      description: cleanDescription,
      returnUrl: returnUrl,
      cancelUrl: cancelUrl,
    };

    const paymentLink = await payos.paymentRequests.create(paymentBody);
    return res.status(201).json({
      paymentUrl: paymentLink.checkoutUrl,
      checkoutId: orderCode,
      message: "Đã tạo thanh toán thành công.",
    });
  } catch (error) {
    console.error("Lỗi tạo lệnh PayOS:", error);
    return res.status(500).json({ message: "Lỗi hệ thống khi tạo lệnh PayOS" });
  }
};

export const checkPrice = async (req, res) => {
  try {
    const { vehicleType, hours } = req.body;
    if (!vehicleType || !hours || hours <= 0)
      return res.status(400).json({ message: "Dữ liệu không hợp lệ!" });

    const priceConfig = await prisma.vehicle_types.findFirst({
      where: { type_name: vehicleType },
    });
    if (!priceConfig)
      return res.status(404).json({ message: "Không tìm thấy giá gửi" });

    const basePrice = Number(priceConfig.base_price);
    const overtimePrice = Number(priceConfig.overtime_price);
    const monthlyPrice =
      Number(priceConfig.monthly_price) ||
      (vehicleType === "Car" ? 1000000.0 : 100000.0);
    let estimatedPrice = 0;

    if (hours <= 4) {
      estimatedPrice = basePrice;
    } else {
      estimatedPrice = basePrice + Math.ceil(hours - 4) * overtimePrice;
    }

    return res.status(200).json({
      vehicleType,
      hours,
      estimatedPrice,
      basePrice,
      overtimePrice,
      monthlyPrice,
      monthlyPrice1Month: monthlyPrice,
      monthlyPrice3Months: monthlyPrice * 3,
      monthlyPrice6Months: monthlyPrice * 6,
      monthlyPrice12Months: monthlyPrice * 12,
    });
  } catch (error) {
    return res.status(500).json({ message: "Lỗi hệ thống tính phí." });
  }
};

export const requestOTP = async (req, res) => {
  try {
    const userId = req.userId;
    const { actionName } = req.body;
    if (!userId)
      return res
        .status(401)
        .json({ message: "Bạn phải đăng nhập để nhận OTP." });

    const user = await prisma.users.findUnique({ where: { id: userId } });
    await sendOTPEmail(
      user.email,
      user.full_name,
      actionName || "Xác thực tài khoản",
    );
    return res
      .status(200)
      .json({ message: "Mã OTP đã được gửi về email thành công!" });
  } catch (error) {
    return res.status(500).json({ message: "Lỗi khi gửi mã OTP." });
  }
};

export const getProfile = async (req, res) => {
  try {
    const userId = req.userId;

    const user = await prisma.users.findUnique({
      where: { id: userId },
      include: { roles: true },
    });
    if (!user)
      return res.status(404).json({ message: "Không tìm thấy người dùng." });

    const userVehicles = await prisma.vehicles.findMany({
      where: { user_id: userId },
    });
    const vehicles = userVehicles.map((vehicle) => ({
      id: vehicle.id,
      plate_number: vehicle.plate_number,
    }));
    const plateNumbers = userVehicles.map((v) => v.plate_number);
    const vehicleIds = userVehicles.map((v) => v.id);

    const dbTickets = await prisma.monthly_tickets.findMany({
      where: {
        plate_number: { in: plateNumbers },
        status: { in: ["Active", "Pending"] },
      },
      orderBy: { expiry_date: "desc" },
    });

    const monthlyTickets = dbTickets.map((ticket) => ({
      plate_number: ticket.plate_number,
      registrationDate: ticket.registration_date
        ? ticket.registration_date.toLocaleString("vi-VN")
        : "",
      expiryDate: ticket.expiry_date
        ? ticket.expiry_date.toLocaleDateString("vi-VN")
        : "",
      pricePaid: Number(ticket.price_paid),
      status: ticket.status,
    }));

    const dbTransactions = await prisma.transactions.findMany({
      where: { vehicle_id: { in: vehicleIds } },
      orderBy: { time_in: "desc" },
    });

    const vehicleMap = {};
    userVehicles.forEach((v) => {
      vehicleMap[v.id] = v.plate_number;
    });

    const parkingHistory = dbTransactions.map((tx) => ({
      plate: vehicleMap[tx.vehicle_id] || "Xe vãng lai",
      timeIn: tx.time_in ? tx.time_in.toLocaleString("vi-VN") : "",
      timeOut: tx.time_out ? tx.time_out.toLocaleString("vi-VN") : "",
      totalAmount: tx.total_amount,
      status: tx.status,
    }));

    return res.status(200).json({
      full_name: user.full_name,
      email: user.email,
      phone: user.phone || "",
      avatar: user.avatar || "",
      role: user.roles?.role_name || "Customer",
      vehicles,
      monthly_tickets: monthlyTickets,
      parking_history: parkingHistory,
    });
  } catch (error) {
    return res.status(500).json({ message: "Lỗi lấy profile." });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const userId = req.userId;
    const { full_name, email, phone, avatar } = req.body;
    if (!full_name || !email)
      return res
        .status(400)
        .json({ message: "Họ tên và email không được để trống." });

    const updatedUser = await prisma.users.update({
      where: { id: userId },
      data: { full_name, email, phone, avatar: avatar || undefined },
    });

    const userWithRole = await prisma.users.findUnique({
      where: { id: userId },
      include: { roles: true },
    });
    return res.status(200).json({
      full_name: updatedUser.full_name,
      email: updatedUser.email,
      phone: updatedUser.phone || "",
      avatar: updatedUser.avatar || "",
      role: userWithRole?.roles?.role_name || "Customer",
      message: "Cập nhật thông tin hồ sơ thành công.",
    });
  } catch (error) {
    return res.status(500).json({ message: "Lỗi cập nhật profile." });
  }
};
