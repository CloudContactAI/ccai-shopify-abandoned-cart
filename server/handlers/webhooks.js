const cartService = require('../services/cart');

/**
 * Handle cart creation webhook
 */
const handleCartCreate = async (topic, shop, body) => {
  try {
    const cart = JSON.parse(body);
    console.log(`Cart created for shop ${shop}: ${cart.id}`);
    
    // Store the cart in our database for tracking
    await cartService.storeCart(shop, cart);
  } catch (error) {
    console.error(`Error handling ${topic} webhook for ${shop}:`, error);
  }
};

/**
 * Handle cart update webhook
 */
const handleCartUpdate = async (topic, shop, body) => {
  try {
    const cart = JSON.parse(body);
    console.log(`Cart updated for shop ${shop}: ${cart.id}`);
    
    // Update the cart in our database
    await cartService.updateCart(shop, cart);
  } catch (error) {
    console.error(`Error handling ${topic} webhook for ${shop}:`, error);
  }
};

/**
 * Handle checkout creation webhook
 */
const handleCheckoutCreate = async (topic, shop, body) => {
  try {
    const checkout = JSON.parse(body);
    console.log(`Checkout created for shop ${shop}: ${checkout.id}`);
    
    // If the checkout is associated with a cart, mark the cart as converted
    if (checkout.cart_token) {
      await cartService.markCartAsConverted(shop, checkout.cart_token);
    }
  } catch (error) {
    console.error(`Error handling ${topic} webhook for ${shop}:`, error);
  }
};

module.exports = {
  handleCartCreate,
  handleCartUpdate,
  handleCheckoutCreate
};
