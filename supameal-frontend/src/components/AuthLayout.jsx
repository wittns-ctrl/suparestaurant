import "../styles/auth.css";

export default function AuthLayout({
  image,
  title,
  subtitle,
  children,
}) {
  return (
    <div className="auth-page">
      <div className="auth-container">

        <div className="auth-left">

          <div className="brand-wrapper">

            <div className="logo-icon">
              🍽
            </div>

            <h1>
              Supa<span>Meal</span>
            </h1>

            <div className="divider">
              <span></span>
              ✦
              <span></span>
            </div>

            <p className="tagline">
              GOOD FOOD. GREAT MOMENTS.
            </p>

            <h3>{title}</h3>

            <p>{subtitle}</p>

          </div>

          <img
            src={image}
            alt=""
            className="auth-food"
          />

        </div>

        <div className="auth-right">
          {children}
        </div>

      </div>
    </div>
  );
}