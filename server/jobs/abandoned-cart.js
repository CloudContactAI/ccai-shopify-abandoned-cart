const Shop = require('../models/shop');
const cartService = require('../services/cart');

/**
 * Process abandoned carts for all shops
 */
const processAbandonedCarts = async () => {
  try {
    // Get all active shops
    const shops = await Shop.find({ isActive: true });
    
    console.log(`Processing abandoned carts for ${shops.length} shops`);
    
    const results = [];
    
    // Process each shop
    for (const shop of shops) {
      try {
        console.log(`Processing abandoned carts for ${shop.shopDomain}...`);
        
        const result = await cartService.processShopAbandonedCarts(shop.shopDomain);
        
        results.push({
          shop: shop.shopDomain,
          success: result.success,
          processed: result.processed,
          error: result.error
        });
        
        console.log(`Processed ${result.processed} abandoned carts for ${shop.shopDomain}`);
      } catch (error) {
        console.error(`Error processing abandoned carts for ${shop.shopDomain}:`, error);
        
        results.push({
          shop: shop.shopDomain,
          success: false,
          processed: 0,
          error: error.message
        });
      }
    }
    
    return {
      totalShops: shops.length,
      results
    };
  } catch (error) {
    console.error('Error processing abandoned carts:', error);
    throw error;
  }
};

module.exports = {
  processAbandonedCarts
};
