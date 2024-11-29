const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
    try {
        
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'Authorization header missing or invalid format'
            });
        }

        const token = authHeader.split(' ')[1];

        const decoded = jwt.verify(token, 'your-secret-key');
      
        const user = await User.findById(decoded.userId);
        if (!user) {
            throw new Error('User not found');
        }

        req.user = user;
        next();

    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(401).json({
            success: false,
            error: 'Please authenticate'
        });
    }
};

module.exports = auth;