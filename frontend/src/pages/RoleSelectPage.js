import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, UserCog, Wrench, Car } from 'lucide-react';

const ROLES = [
  {
    id: 'manager',
    title: 'Manager',
    desc: 'Full administrative access. View all fleet data and manage vehicles, reservations, and maintenance tasks.',
    icon: Shield,
  },
  {
    id: 'employee',
    title: 'Employee',
    desc: 'View fleet data, reservations, and maintenance logs. Read-only access to management functions.',
    icon: UserCog,
  },
  {
    id: 'mechanic',
    title: 'Mechanic',
    desc: 'Vehicle-focused view. Access technical diagnostics, maintenance tasks, and condition reports.',
    icon: Wrench,
  },
];

export default function RoleSelectPage() {
  const { selectRole } = useAuth();
  const navigate = useNavigate();

  const handleSelect = (roleId) => {
    selectRole(roleId);
    navigate('/dashboard');
  };

  return (
    <div className="role-select">
      <div className="role-select__container">
        <div className="role-select__logo">
          <Car size={32} />
        </div>
        <h1 className="role-select__title">Concourse Fleet</h1>
        <p className="role-select__subtitle">
          Enterprise Fleet Management Terminal. Select your access level to continue.
        </p>
        <div className="role-select__cards">
          {ROLES.map(({ id, title, desc, icon: Icon }) => (
            <div key={id} className="role-card" onClick={() => handleSelect(id)}>
              <div className="role-card__icon">
                <Icon />
              </div>
              <h3 className="role-card__title">{title}</h3>
              <p className="role-card__desc">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
