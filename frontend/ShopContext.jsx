import { createContext, useContext, useEffect, useState } from 'react';

const ShopContext = createContext({
  shop: null,
  host: null,
  loading: true,
  error: null,
});

export const ShopProvider = ({ children, shopOrigin, host }) => {
  const [shop, setShop] = useState(null);
  const [storedHost, setStoredHost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const hostFromUrl = host || searchParams.get('host') || localStorage.getItem('host');
    const shopFromUrl = shopOrigin || searchParams.get('shop') || localStorage.getItem('shop');

    if (shopFromUrl && hostFromUrl) {
      setShop(shopFromUrl);
      setStoredHost(hostFromUrl);
      localStorage.setItem('shop', shopFromUrl);
      localStorage.setItem('host', hostFromUrl);
      setLoading(false);
    } else {
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
          setError(
            'No shop found in session, URL, or storage. Please launch the app from the Shopify Admin.'
          );
        })
        .finally(() => setLoading(false));
    }
  }, [shopOrigin, host]);

  return (
    <ShopContext.Provider value={{ shop, host: storedHost, loading, error }}>
      {children}
    </ShopContext.Provider>
  );
};

export const useShop = () => useContext(ShopContext);
