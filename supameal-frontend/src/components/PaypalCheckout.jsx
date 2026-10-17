import { useEffect, useRef, useState } from 'react';

const SDK_SCRIPT_ID = 'paypal-checkout-sdk';

const PaypalCheckout = ({ clientId, currency = 'USD', paypalOrderId, onApprove, onError, onCancel }) => {
  const buttonHost = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!clientId || !paypalOrderId || !buttonHost.current) return undefined;
    let cancelled = false;
    let buttons;
    const host = buttonHost.current;
    const handleScriptError = () => onError('Unable to load PayPal checkout. Check your connection and PayPal configuration.');
    const renderButtons = () => {
      if (cancelled || !window.paypal?.Buttons) return;
      buttons = window.paypal.Buttons({
        style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'paypal', tagline: false },
        createOrder: () => paypalOrderId,
        onApprove: (data) => onApprove(data.orderID),
        onCancel,
        onError: (error) => onError(error?.message || 'PayPal payment could not be completed.'),
      });
      buttons.render(host).then(() => { if (!cancelled) setReady(true); }).catch(onError);
    };

    if (window.paypal?.Buttons) {
      renderButtons();
    } else {
      let script = document.getElementById(SDK_SCRIPT_ID);
      if (!script) {
        script = document.createElement('script');
        script.id = SDK_SCRIPT_ID;
        script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=${encodeURIComponent(currency)}&intent=capture&components=buttons`;
        script.async = true;
        document.head.appendChild(script);
      }
      script.addEventListener('load', renderButtons);
      script.addEventListener('error', handleScriptError);
      if (script.dataset.loaded === 'true') renderButtons();
      const markLoaded = () => { script.dataset.loaded = 'true'; };
      script.addEventListener('load', markLoaded);
    }

    return () => {
      cancelled = true;
      if (buttons?.close) buttons.close().catch(() => {});
      host.innerHTML = '';
    };
  }, [clientId, currency, paypalOrderId, onApprove, onError, onCancel]);

  return (
    <div>
      {!ready && <p style={{ color: 'var(--dash-muted, #8a8a8a)', textAlign: 'center' }}>Loading PayPal checkout…</p>}
      <div ref={buttonHost} />
    </div>
  );
};

export default PaypalCheckout;
