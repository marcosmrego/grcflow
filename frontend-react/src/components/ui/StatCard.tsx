
interface StatCardProps {
  icon: string
  label: string
  value: number | string
  iconClass?: string
  onClick?: () => void
}

export function StatCard({ icon, label, value, iconClass = '', onClick }: StatCardProps) {
  return (
    <div className="stat-card" onClick={onClick} style={onClick ? { cursor: 'pointer' } : undefined}>
      <div className={`stat-icon ${iconClass}`}>{icon}</div>
      <div className="stat-content">
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  )
}

