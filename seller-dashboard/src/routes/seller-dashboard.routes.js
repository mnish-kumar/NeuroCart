const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');


router.get(
    '/matrics', 
    authMiddleware.authMiddleware,
    
);

module.exports = router;