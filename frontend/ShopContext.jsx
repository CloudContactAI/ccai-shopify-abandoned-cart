import { createContext, useContext, useEffect, useState } from 'react';

const ShopContext = createContext({
  shop: null,
  host: null,
  loading: true,
  error: null,
});

export const ShopProvider = ({ children, shopOrigin, host }) => {
  const [shop, setShop] = useState(() => shopOrigin || localStorage.getItem('shop'));
  const [storedHost, setStoredHost] = useState(() => host || localStorage.getItem('host'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Save to localStorage if passed in
    if (shopOrigin) {
      setShop(shopOrigin);
      localStorage.setItem('shop', shopOrigin);
      setLoading(false);
    }

    if (host) {
      setStoredHost(host);
      localStorage.setItem('host', host);
    }

    // Fallback to backend if shop is still undefined
    if (!shopOrigin && !shop) {
      fetch('/api/shop')
        .then((res) => {
          if (!res.ok) throw new Error('Failed to fetch shop');
          return res.json();
        })
        .then((data) => {
          if (data.shop) {
            setShop(data.shop);
            localStorage.setItem('shop', data.shop);
          } else {
            throw new Error('No shop in response');
          }
        })
        .catch((err) => {
          console.error('❌ Error fetching shop:', err);
          setError('No shop found in session, URL, or storage. Please launch the app from the Shopify Admin.');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [shopOrigin, host]);

  return (
    <ShopContext.Provider value={{ shop, host: storedHost, loading, error }}>
      {children}
    </ShopContext.Provider>
  );
};

export const useShop = () => useContext(ShopContext);
