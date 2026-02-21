import { useState, useRef, useEffect } from 'react';
import { LayoutDashboard, Send, Users, FileText, Settings, BarChart3, Mail, ChevronDown, LogOut } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import '../../styles/Layout.css';

const Sidebar = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const links = [
        { name: 'Dashboard', path: '/', icon: LayoutDashboard },
        { name: 'Campaigns', path: '/campaigns', icon: Send },
        { name: 'Contacts', path: '/contacts', icon: Users },
        { name: 'Templates', path: '/templates', icon: FileText },
        { name: 'Analytics', path: '/analytics', icon: BarChart3 },
        { name: 'Senders', path: '/settings/senders', icon: Mail },
        { name: 'Settings', path: '/settings', icon: Settings },
    ];

    return (
        <div className="sidebar">
            <div className="sidebar-header">
                <h1 className="logo">
                    Outreach Pro
                </h1>
            </div>

            <nav className="sidebar-nav">
                {links.map((link) => {
                    const Icon = link.icon;
                    const isActive = location.pathname === link.path;

                    return (
                        <Link
                            key={link.path}
                            to={link.path}
                            className={`nav-link ${isActive ? 'active' : ''}`}
                        >
                            <Icon size={20} />
                            <span className="link-text">{link.name}</span>
                        </Link>
                    );
                })}
            </nav>

            <div className="sidebar-footer">
                <div className="user-profile-dropdown" ref={dropdownRef}>
                    <button 
                        className="user-profile-btn"
                        onClick={() => setDropdownOpen(!dropdownOpen)}
                    >
                        <div className="user-avatar">
                            {user?.picture_url ? (
                                <img src={user.picture_url} alt={user.name || 'User'} />
                            ) : (
                                <span>{(user?.name || 'U')[0].toUpperCase()}</span>
                            )}
                        </div>
                        <div className="user-info">
                            <p className="user-name">{user?.name || 'User'}</p>
                            <p className="user-email">{user?.email || 'user@example.com'}</p>
                        </div>
                        <ChevronDown size={16} className={`dropdown-arrow ${dropdownOpen ? 'open' : ''}`} />
                    </button>
                    
                    {dropdownOpen && (
                        <div className="dropdown-menu">
                            <button 
                                className="dropdown-item logout"
                                onClick={() => {
                                    logout();
                                    setDropdownOpen(false);
                                    navigate('/login');
                                }}
                            >
                                <LogOut size={16} />
                                <span>Logout</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
