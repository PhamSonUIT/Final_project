import jwt from 'jsonwebtoken';
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET ;

export const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: "Truy cập bị từ chối! Vui lòng đăng nhập." });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.userId; 
        req.userRole = decoded.role; 
        next(); 
    } catch (error) {
        return res.status(403).json({ message: "Token đã hết hạn hoặc không hợp lệ!" });
    }
};

export const checkRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!allowedRoles.includes(req.userRole)) {
            return res.status(403).json({ message: "Bạn không có quyền thực hiện hành động này!" });
        }
        next();
    };
};