const userModel = require('../models/user.model');
const paymentModel = require('../models/payment.model');
const orderModel = require('../models/order.model');
const productModel = require('../models/product.model');

async function getSellerMetrics(req, res) {
    try {
        const seller = req.user;



    }catch (error) {
        console.error('Error fetching seller metrics:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while fetching seller metrics'
        });
    }
}

async function getSellerOrders(req, res) {

}

async function getSellerProducts(req, res) {

}

module.exports = {
    getSellerMetrics,
    getSellerOrders,
    getSellerProducts
}