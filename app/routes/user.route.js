import { Router } from "express";
import { UserController } from "../controllers/user.controller.js"
import { verifyToken } from "../middlewares/jwt.middleware.js";
import { BoardController } from "../controllers/board.controller.js";

const router = Router()

router.post('/register', UserController.register)
router.post('/login', UserController.login)
router.get('/profile', verifyToken, UserController.profile)
router.post('/board', verifyToken, BoardController.createBoard)
router.post('/board/join', verifyToken, BoardController.joinBoard)
router.post('/board/export', verifyToken, BoardController.exportDiagram)
router.post('/board/import', verifyToken, BoardController.importDiagram)
router.get('/access/findAll', verifyToken, BoardController.getAdminBoards)
router.post('/board/:codigo/save', verifyToken, BoardController.saveDiagram)
router.get('/board/:codigo/recuperar', verifyToken, BoardController.getDiagram)

export default router;