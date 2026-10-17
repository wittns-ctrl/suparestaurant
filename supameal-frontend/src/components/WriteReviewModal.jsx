import { useState } from "react";
import { Star, X, Loader2 } from "lucide-react";
import { reviewsApi } from "../services/api";
import { useToast } from "../context/ToastContext";

const WriteReviewModal = ({ restaurantId, restaurantName, orderId, onClose, onSubmitted }) => {
  const [rating, setRating] = useState(5);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!comment.trim()) {
      showToast("Please write a comment before submitting.", "error");
      return;
    }
    setSubmitting(true);
    try {
      await reviewsApi.create({ restaurantId, rating, comment: comment.trim() });
      showToast("Thank you! Your review has been posted.", "success");
      onSubmitted?.();
      onClose();
    } catch (err) {
      showToast(err.message || "Could not submit your review — please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const displayRating = hovered || rating;
  const labels = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "1rem",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: "#181818",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 20,
        padding: "2rem",
        width: "100%",
        maxWidth: 460,
        position: "relative",
      }}>
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: "1rem", right: "1rem",
            background: "none", border: "none", cursor: "pointer",
            color: "rgba(255,255,255,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <X size={20} />
        </button>

        <h2 style={{ color: "#fff", fontSize: "1.3rem", fontWeight: 700, marginBottom: "0.4rem" }}>
          Write a Review
        </h2>
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.85rem", marginBottom: "1.75rem" }}>
          {restaurantName
            ? `How was your experience at ${restaurantName}?`
            : "How was your dining experience?"}
          {orderId && (
            <span style={{ color: "rgba(255,255,255,0.3)" }}> &middot; Order #{orderId}</span>
          )}
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ display: "flex", gap: "0.35rem", marginBottom: "1.5rem", alignItems: "center" }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onMouseEnter={() => setHovered(n)}
                onMouseLeave={() => setHovered(0)}
                onClick={() => setRating(n)}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  padding: "0.25rem", transition: "transform 0.15s",
                  transform: n <= displayRating ? "scale(1.2)" : "scale(1)",
                }}
                aria-label={`${n} star${n > 1 ? "s" : ""}`}
              >
                <Star
                  size={30}
                  fill={n <= displayRating ? "var(--warning)" : "none"}
                  color={n <= displayRating ? "var(--warning)" : "rgba(255,255,255,0.2)"}
                />
              </button>
            ))}
            <span style={{ marginLeft: "0.5rem", color: "rgba(255,255,255,0.6)", fontSize: "0.9rem", fontWeight: 600 }}>
              {labels[displayRating]}
            </span>
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", color: "rgba(255,255,255,0.5)", fontSize: "0.8rem", marginBottom: "0.5rem", fontWeight: 500 }}>
              Your Experience *
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              placeholder="Describe your experience - food quality, service, ambiance..."
              required
              style={{
                width: "100%",
                background: "#1a1a1a",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 10,
                color: "#fff",
                padding: "0.85rem 1rem",
                fontSize: "0.9rem",
                resize: "vertical",
                boxSizing: "border-box",
                outline: "none",
                fontFamily: "inherit",
              }}
              onFocus={(e) => { e.target.style.borderColor = "var(--fresh-accent)"; }}
              onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; }}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{
              width: "100%",
              background: submitting ? "rgba(198,241,53,0.6)" : "var(--fresh-accent)",
              color: "#000",
              border: "none",
              borderRadius: 10,
              padding: "0.9rem",
              fontWeight: 700,
              fontSize: "0.95rem",
              cursor: submitting ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
            }}
          >
            {submitting && <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />}
            {submitting ? "Submitting..." : "Submit Review"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default WriteReviewModal;
