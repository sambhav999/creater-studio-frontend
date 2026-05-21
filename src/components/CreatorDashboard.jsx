import { BarChart3, Coins, Eye, Star } from "lucide-react";

const stats = [
  { label: "Games", value: "10", icon: BarChart3 },
  { label: "Plays", value: "24.8k", icon: Eye },
  { label: "Rating", value: "4.8", icon: Star },
  { label: "Revenue", value: "$1.9k", icon: Coins }
];

export function CreatorDashboard() {
  return (
    <article className="dashboard-card">
      <div className="panel-title">
        <BarChart3 size={18} />
        <h3>Creator Dashboard</h3>
      </div>
      <div className="dashboard-stats">
        {stats.map(item => {
          const Icon = item.icon;
          return (
            <div key={item.label}>
              <Icon size={17} />
              <strong>{item.value}</strong>
              <span>{item.label}</span>
            </div>
          );
        })}
      </div>
    </article>
  );
}
