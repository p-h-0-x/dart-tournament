import { useNavigate } from 'react-router-dom';

interface MobileBackHeaderProps {
  to: string;
  label: string;
}

export default function MobileBackHeader({ to, label }: MobileBackHeaderProps) {
  const navigate = useNavigate();

  return (
    <button
      className="mobile-back-header"
      onClick={() => navigate(to)}
    >
      <span className="mobile-back-arrow">&larr;</span>
      <span>{label}</span>
    </button>
  );
}
