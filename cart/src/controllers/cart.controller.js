const { default: mongoose } = require('mongoose');
const cartModel = require('../models/cart.model');


/** 
 * @route POST /api/cart/items
 * @desc Add an item to the cart or update quantity if it already exists. Returns the updated cart with recalculated totals.
 * @access Private (requires 'user' role)
 * @body { productId: string, qty: number }
*/
async function addItemToCart(req, res){
    const { productId, qty } = req.body;
    const user = req.user;

    try {
        let cart = await cartModel.findOne({
            user: user.id 
        });

        if (!cart) {
            const cartData = {
                user: user.id,
                items: [],
            };

            cart = new cartModel(cartData);
        }

        const existingItemIndex = cart.items.findIndex(
            item => item.productId.toString() === productId
        );
        
        if (existingItemIndex !== -1) {
            cart.items[existingItemIndex].qty += qty;
        } else {
            cart.items.push({ productId, qty });
        }

        await cart.save();

        res.status(200).json({
            message: 'Item added to cart successfully',
            cart,
        });
    } catch (err) {
        console.error('Error in addItemToCart:', err);
        res.status(500).json({ error: 'Internal server error' });
    }

}


/** * @route PATCH /api/cart/items/:productId
 * @desc Update quantity of an existing cart item. Returns the updated cart.
 * @access Private (requires 'user' role)
 * @param {string} productId
 * @body { qty: number }
*/
async function updateCartItemQty(req, res) {
    const { productId } = req.params;
    const { qty } = req.body;
    const user = req.user;

    try {
        const cart = await cartModel.findOne({
            user: user._id,
        });

        if (!cart) {
            return res.status(404).json({ 
                message: 'Cart not found' 
            });
        }

        const existingItemIndex = cart.items.findIndex(
            item => item.productId.toString() === productId
        );

        if (existingItemIndex === -1) {
            return res.status(404).json({ 
                message: 'Item not found in cart' 
            });
        }

        cart.items[existingItemIndex].qty = qty;
        await cart.save();

        return res.status(200).json({
            message: 'Cart item updated successfully',
            cart,
        });
    } catch (err) {
        console.error('Error in updateCartItemQty:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}


/**
 * @route GET /api/cart
 * @desc Get the current user's cart with item details and totals.
 * @access Private (requires 'user' role)
 */
async function getCart(req, res) {
    const user = req.user;

    try {
        let cart = await cartModel.findOne({
            user: user.id,
        });

        if (!cart) {
            cart =  new cartModel({
                user: user.id,
                items: [],
            });
            await cart.save();
        }

        res.status(200).json({
            cart,
            totals: {
                totalItems: cart.items.length,
                totalQty: cart.items.reduce((sum, item) => sum + item.qty, 0),
            },
            message: 'Cart retrieved successfully',
        });
    } catch (err) {
        console.error('Error in getCart:', err);
        res.status(500).json({ error: 'Internal server error' });
    }

}


/** 
 * @route DELETE /api/cart/items/:productId
 * @desc Remove an item from the cart. Returns the updated cart.
 * @access Private (requires 'user' role)
 * @param {string} productId
 */
async function removeItemFromCart(req, res) {
    const { productId } = req.params;
    const user = req.user;

    if (mongoose.Types.ObjectId.isValid(productId) === false) {
        return res.status(400).json({ message: 'Invalid product ID format' });
    }

    try {
        const cart = await cartModel.findOne({
            user: user._id,
        });

        if (!cart) {
            return res.status(404).json({
                message: 'Cart not found',
            });
        }

        const cartItems = Array.isArray(cart.items) ? cart.items : [];
        const itemIndex = cartItems.findIndex(
            item => item.productId.toString() === productId
        );

        if (itemIndex === -1) {
            return res.status(404).json({
                message: 'Item not found in cart',
            });
        }

        const updatedCart = await cartModel.findOneAndUpdate({
            user: user._id,
        }, {
            $pull: { items: { productId } },
        }, {
            new: true,
        })

        return res.status(200).json({
            message: 'Item removed from cart successfully',
            cart: updatedCart,
        });
    } catch (err) {
        if (err.name === 'CastError') {
            return res.status(400).json({ message: 'Invalid product ID format' });
        }
        
        console.error('Error in removeItemFromCart:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }

}


/**
 * @route DELETE /api/cart
 * @desc Delete the entire cart for the current user. Returns a success message and the deleted cart ID.
 * @access Private (requires 'user' role)
 */
async function deleteCart(req, res) {
    const user = req.user;

    try {
        const deletedCart = await cartModel.findOneAndDelete({
            user: user._id,
        });

        if (!deletedCart) {
            return res.status(404).json({
                message: 'Cart not found',
            });
        }

        return res.status(200).json({
            message: 'Cart deleted successfully',
            cartID: deletedCart._id,
        });

    }catch (err) {
        console.error('Error in deleteCart:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}


module.exports = {
    addItemToCart,
    updateCartItemQty,
    getCart,
    removeItemFromCart,
    deleteCart,
}
