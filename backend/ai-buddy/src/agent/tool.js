const { tool } = require('@langchain/core/tools');
const { z, json } = require('zod');
const axios = require('axios');

const searchProduct = tool(async ({ query, token }) => {
    console.log(`Searching for product with query: query: ${query}, token: ${token}`);
    try {
        const response = await axios.get(`neurocart-alb-1754343233.ap-south-1.elb.amazonaws.com/api/products?q=${query}`, 
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        )

        return json.stringify(response.data);
    }catch (error) {
        console.error('Error searching product:', error);
        throw new Error('Failed to search product');
    }
},
{
    name: "searchProduct",
    description: "Search a product based on the query.",
    schema: z.object({
      query: z.string().describe("The search query for the product."),
    }),
});


const addProductToCart = tool(async ({ productId, qty = 1, token }) => {
    try {
        const response = await axios.post(`neurocart-alb-1754343233.ap-south-1.elb.amazonaws.com/api/cart/items`,
            {
                productId,
                qty
            },
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        return `Add product with ID ${productId} and quantity ${qty} to cart successfully.`;
        
    }catch (error) {
        console.error('Error adding product to cart:', error);
        throw new Error('Failed to add product to cart');
    }
},
{
    name: "addProductToCart",
    description: "Add a product to the shopping cart.",
    schema: z.object({
      productId: z.string().describe("The ID of the product to add to the cart."),
      qty: z.number().describe("The quantity of the product to add to the cart.").default(1),
    }),
});

module.exports = {
    searchProduct,
    addProductToCart
};