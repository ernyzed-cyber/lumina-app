import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Legacy route — redirects to /shop (Stars store).
 * Kept so any saved bookmarks or deep-links still work.
 */
export default function Premium() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate('/shop', { replace: true });
  }, [navigate]);
  return null;
}
