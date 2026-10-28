import { useSiteStats } from "../lib/stats.jsx";
import { Icon } from "./Icons.jsx";

// "Live now" visitors and the like button. Hidden until the server answers, so an offline API leaves no gap.

export default function SiteStats({ className = "" }) {
  const { live, likes, liked, online, toggleLike } = useSiteStats();
  if (!online) return null;

  return (
    <div className={`site-stats ${className}`}>
      <span className="live-pill" title="Visitors on the site right now">
        <span className="pulse-dot" aria-hidden="true" />
        {Math.max(live, 1)} live now
      </span>
      <button type="button" className="like-btn" aria-pressed={liked} aria-label={liked ? "Remove your like" : "Like this portfolio"} data-track="Like portfolio" onClick={toggleLike}>
        <Icon name="heart" size={18} animated={false} />
        <span>{likes}</span>
      </button>
    </div>
  );
}
