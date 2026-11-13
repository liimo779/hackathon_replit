import { Router, type IRouter } from "express";
import healthRouter from "./health";
import accounts from "./accounts";
import catalog from "./catalog";
import orders from "./orders";
import billing from "./billing";
import admin from "./admin";
import storage from "./storage";
import rewards from "./rewards";

const router: IRouter = Router();

router.use(healthRouter);
router.use(accounts);
router.use(catalog);
router.use(orders);
router.use(billing);
router.use(admin);
router.use(storage);
router.use(rewards);

export default router;
