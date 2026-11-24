import { Router } from "express";
import { authController } from "../controllers/authController";
import { authenticateToken, requireRole } from "../middlewares/authMiddleware";

const router = Router();

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/refresh", authController.refresh);
router.get("/me", authenticateToken, authController.getCurrentUser);

// Protected test endpoint for RBAC
router.get("/admin-only", authenticateToken, requireRole(["admin"]), (req, res) => {
  res.json({ message: "Welcome Admin" });
});

router.get("/analyst-only", authenticateToken, requireRole(["admin", "analyst"]), (req, res) => {
  res.json({ message: "Welcome Analyst or Admin" });
});

export default router;
