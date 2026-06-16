import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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

export const checkParking = async (req, res) => {
  try {
    const { rfid_uid, plate, image, overrideVehicleTypeName } = req.body;
    const processedBy = req.userId; // Bốc ra ID nhân viên trực chốt từ token xác thực

    if (!rfid_uid)
      return res.status(400).json({ message: "⚠️ Thiếu mã thẻ RFID!" });
    if (!plate || plate === "---")
      return res
        .status(400)
        .json({ message: "⚠️ Chưa bắt được biển số xe hiển thị!" });

    const cleanPlate = plate.replace(/[\s\.\-]/g, "").toUpperCase();
    const cleanRfidUid = rfid_uid.trim().toUpperCase();

    let rfidCard = await prisma.rfid_cards.findUnique({
      where: { card_uid: cleanRfidUid },
    });

    if (!rfidCard) {
      console.log(`${cleanRfidUid}`);
      rfidCard = await prisma.rfid_cards.create({
        data: {
          card_uid: cleanRfidUid,
          card_type: "Visitor",
          status: "Active",
        },
      });
    }

    const cardInParkTx = await prisma.transactions.findFirst({
      where: {
        rfid_card_id: rfidCard.id,
        status: "In_Park",
      },
      orderBy: { time_in: "desc" },
      include: { vehicles: true },
    });

    if (cardInParkTx) {
      if (cardInParkTx.plate_number !== cleanPlate) {
        return res.status(400).json({
          message: `⚠️ TỪ CHỐT GIAO DỊCH (GIAO LẬN THẺ): Thẻ này đang được sử dụng để gửi xe [${cardInParkTx.plate_number}] trong bãi. Không thể dùng chung thẻ này cho xe [${cleanPlate}]!`,
        });
      }

      const timeDifference =
        Date.now() - new Date(cardInParkTx.time_in).getTime();
      if (timeDifference < 5000) {
        return res
          .status(400)
          .json({
            message:
              "⚠️ LỖI TRÙNG THẺ: Hệ thống vừa ghi nhận quẹt thẻ này, vui lòng đợi 5 giây!",
          });
      }

      const typeConfig = await prisma.vehicle_types.findFirst({
        where: {
          type_name:
            overrideVehicleTypeName || detectTypeFromPlateText(cleanPlate),
        },
      });

      let imageBase64Data = await saveWebcamImage(image, cleanPlate);

      const timeOutMs = Date.now();
      const durationMinutes = Math.ceil(
        (timeOutMs - new Date(cardInParkTx.time_in).getTime()) / (1000 * 60),
      );
      const durationHours = durationMinutes / 60;
      let parkingFee = 0;
      let chargeMessage = "Tính phí theo lượt.";

      let vehicle = await prisma.vehicles.findUnique({
        where: { plate_number: cleanPlate },
      });
      const activeTicket = vehicle
        ? await prisma.monthly_tickets.findFirst({
            where: {
              vehicle_id: vehicle.id,
              status: "Active",
              expiry_date: { gte: new Date() },
            },
          })
        : null;

      if (activeTicket) {
        parkingFee = 0;
        chargeMessage = "🎉 Xe đăng ký Vé Tháng (Miễn phí lượt).";
      } else if (typeConfig) {
        const basePrice = Number(typeConfig.base_price);
        const overtimePrice = Number(typeConfig.overtime_price);
        parkingFee =
          durationHours <= 4
            ? basePrice
            : basePrice + Math.ceil(durationHours - 4) * overtimePrice;
      }

      const updatedTx = await prisma.transactions.update({
        where: { id: cardInParkTx.id },
        data: {
          time_out: new Date(),
          image_out_path: imageBase64Data,
          total_amount: parkingFee,
          status: "Completed",
          users: {
            connect: { id: processedBy },
          },
        },
      });

      const slots = await countCurrentAvailableSlots();
      return res.status(200).json({
        status: "OUT",
        plate: cleanPlate,
        imageIn: cardInParkTx.image_in_path,
        imageOut: updatedTx.image_out_path,
        timeIn: new Date(cardInParkTx.time_in).toLocaleString("vi-VN"),
        timeOut: new Date(updatedTx.time_out).toLocaleString("vi-VN"),
        duration: durationMinutes,
        price: parkingFee,
        message: chargeMessage,
        availableBikes: slots.availableBikes,
        availableCars: slots.availableCars,
      });
    }

    const plateInParkTx = await prisma.transactions.findFirst({
      where: {
        plate_number: cleanPlate,
        status: "In_Park",
      },
    });

    if (plateInParkTx) {
      return res.status(400).json({
        message: `⚠️ TỪ CHỐI XE VÀO: Xe có biển số [${cleanPlate}] hiện đã được ghi nhận đang ở TRONG bãi (quẹt bằng một thẻ khác). Không thể cho xe này vào thêm một lần nữa!`,
      });
    }

    const finalVehicleTypeName =
      overrideVehicleTypeName || detectTypeFromPlateText(cleanPlate);
    const typeConfig = await prisma.vehicle_types.findFirst({
      where: { type_name: finalVehicleTypeName },
    });

    let imageBase64Data = await saveWebcamImage(image, cleanPlate);

    let vehicle = await prisma.vehicles.findUnique({
      where: { plate_number: cleanPlate },
    });
    if (!vehicle) {
      vehicle = await prisma.vehicles.create({
        data: {
          plate_number: cleanPlate,
          vehicle_type_id: typeConfig?.id || 1,
        },
      });
    }

    const newTx = await prisma.transactions.create({
      data: {
        vehicles: { connect: { id: vehicle.id } },
        rfid_cards: { connect: { id: rfidCard.id } },
        plate_number: cleanPlate,
        image_in_path: imageBase64Data,
        status: "In_Park",
        users: {
          connect: { id: processedBy },
        },
      },
    });

    const slots = await countCurrentAvailableSlots();
    return res.status(201).json({
      status: "IN",
      plate: cleanPlate,
      imageIn: newTx.image_in_path,
      timeIn: new Date(newTx.time_in).toLocaleString("vi-VN"),
      availableBikes: slots.availableBikes,
      availableCars: slots.availableCars,
    });
  } catch (error) {
    console.error("Lỗi hệ thống tại checkParking:", error);
    return res
      .status(500)
      .json({ message: "Lỗi hệ thống xử lý quẹt thẻ bến bãi." });
  }
};

export const getAvailableSlots = async (req, res) => {
  try {
    const slots = await countCurrentAvailableSlots();
    return res.status(200).json(slots);
  } catch (error) {
    console.error("Lỗi tính slot trống:", error);
    return res
      .status(500)
      .json({ message: "Lỗi hệ thống tính toán slot bãi." });
  }
};

export const detectVehicleType = async (req, res) => {
  try {
    const { plate } = req.body;
    if (!plate)
      return res.status(400).json({ message: "Thiếu chuỗi biển số xe." });

    const detected = detectTypeFromPlateText(plate);
    return res.status(200).json({
      vehicleTypeName: detected,
      vehicleTypeId: detected === "Motorbike" ? 1 : 2,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Lỗi xử lý định vị loại phương tiện." });
  }
};

export const sendHistoryOTP = async (req, res) => {
  try {
    const { plate } = req.body;
    const cleanPlate = plate.replace(/[\s\.\-]/g, "").toUpperCase();

    const activeTicket = await prisma.monthly_tickets.findFirst({
      where: { plate_number: cleanPlate, status: "Active" },
      include: { user: true },
    });

    if (!activeTicket || !activeTicket.user) {
      return res.status(403).json({
        message:
          "Phương tiện chưa đăng ký hệ thống hoặc chưa kích hoạt gói Vé Tháng ",
      });
    }

    const targetEmail = activeTicket.user.email;

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await prisma.otp_verifications.create({
      data: {
        email: targetEmail,
        otp_code: otpCode,
        expires_at: expiresAt,
      },
    });

    console.log(` ${cleanPlate}, ${targetEmail}, ${otpCode}`);

    return res.status(200).json({
      message: `Mã OTP đối soát tài khoản đã được gửi về hộp thư ẩn dạng: ***${targetEmail.substring(3)}`,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Lỗi hệ thống cấp OTP bổ sung xe." });
  }
};

export const getVehicleHistory = async (req, res) => {
  try {
    const { plate, otp } = req.body;
    const userId = req.userId;
    const cleanPlate = plate.replace(/[\s\.\-]/g, "").toUpperCase();

    const activeTicket = await prisma.monthly_tickets.findFirst({
      where: { plate_number: cleanPlate, status: "Active" },
      include: { user: true },
    });

    if (!activeTicket || !activeTicket.user) {
      return res
        .status(400)
        .json({ message: "Không tìm thấy hồ sơ xe hợp lệ." });
    }

    const validOtp = await prisma.otp_verifications.findFirst({
      where: {
        email: activeTicket.user.email,
        otp_code: otp,
        expires_at: { gte: new Date() },
      },
    });

    if (!validOtp) {
      return res
        .status(400)
        .json({ message: "Mã xác thực OTP sai hoặc đã hết hạn sử dụng!" });
    }

    await prisma.vehicles.update({
      where: { plate_number: cleanPlate },
      data: { user_id: userId },
    });

    await prisma.otp_verifications.delete({ where: { id: validOtp.id } });

    return res.status(200);
  } catch (error) {
    return res.status(500);
  }
};

export const updatePrice = async (req, res) => {
  const { id, base_price, overtime_price, monthly_price } = req.body;
  const typeNameString = Number(id) === 1 ? "Motorbike" : "Car";
  try {
    const updatedType = await prisma.vehicle_types.updateMany({
      where: { type_name: typeNameString },
      data: {
        base_price: parseFloat(base_price),
        overtime_price: parseFloat(overtime_price),
        monthly_price: parseFloat(monthly_price),
      },
    });

    return res.status(200).json({
      message: "Cập nhật giá thành công!",
      data: updatedType,
    });
  } catch (error) {
    console.error("Lỗi tại updatePrice Controller:", error);
    return res.status(500).json({ message: "không thể cập nhật giá." });
  }
};

async function saveWebcamImage(image, cleanPlate) {
  if (!image) return "";

  return image;
}

async function countCurrentAvailableSlots() {
  const maxBikeCapacity = 200;
  const maxCarCapacity = 50;

  const activeInParkTransactions = await prisma.transactions.findMany({
    where: { status: "In_Park" },
    include: { vehicles: { include: { vehicle_types: true } } },
  });

  const parkedBikes = activeInParkTransactions.filter(
    (tx) => tx.vehicles?.vehicle_types?.type_name === "Motorbike",
  ).length;
  const parkedCars = activeInParkTransactions.filter(
    (tx) => tx.vehicles?.vehicle_types?.type_name === "Car",
  ).length;

  return {
    availableBikes: Math.max(0, maxBikeCapacity - parkedBikes),
    availableCars: Math.max(0, maxCarCapacity - parkedCars),
  };
}
