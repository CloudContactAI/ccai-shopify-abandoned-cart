const cartService = require('../services/cart');

/**
 * Handle cart creation webhook
 */
const handleCartCreate = async (topic, shop, body) => {
  try {
    const cart = JSON.parse(body);
    if (!cart?.id) throw new Error('Missing cart ID');

    console.log(`[Webhook] Cart created for shop ${shop}: ${cart.id}`);

    await cartService.storeCart(shop, cart);
  } catch (error) {
    console.error(`[Webhook Error] ${topic} for ${shop}:`, error.message);
    if (process.env.NODE_ENV === 'development') console.error(error.stack);
  }
};

/**
 * Handle cart update webhook
 */
const handleCartUpdate = async (topic, shop, body) => {
  try {
    const cart = JSON.parse(body);
    if (!cart?.id) throw new Error('Missing cart ID');

    console.log(`[Webhook] Cart updated for shop ${shop}: ${cart.id}`);

    await cartService.updateCart(shop, cart);
  } catch (error) {
    console.error(`[Webhook Error] ${topic} for ${shop}:`, error.message);
    if (process.env.NODE_ENV === 'development') console.error(error.stack);
  }
};

/**
 * Handle checkout creation webhook
 */
const handleCheckoutCreate = async (topic, shop, body) => {
  try {
    const checkout = JSON.parse(body);
    console.log(`[Webhook] Checkout created for shop ${shop}: ${checkout.id}`);

    if (checkout?.cart_token) {
      await cartService.markCartAsConverted(shop, checkout.cart_token);
    } else {
      console.warn(`[Webhook] Checkout ${checkout.id} missing cart_token`);
    }
  } catch (error) {
    console.error(`[Webhook Error] ${topic} for ${shop}:`, error.message);
    if (process.env.NODE_ENV === 'development') console.error(error.stack);
  }
};

module.exports = {
  handleCartCreate,
  handleCartUpdate,
  handleCheckoutCreate,
};
