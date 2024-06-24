import express from 'express';
import { outlookAuth,outlookCallback} from '../controllers/outlookController';
const router = express.Router();


router.get('/auth',outlookAuth);
router.get('/callback', outlookCallback);

module.exports = router;
