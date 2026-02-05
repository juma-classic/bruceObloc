import { useLocation } from 'react-router-dom';
import clsx from 'clsx';
import './RichMotherNavButton.scss';

interface RichMotherNavButtonProps {
    variant?: 'header' | 'sidebar' | 'mobile';
    onClick?: () => void;
}

export const RichMotherNavButton: React.FC<RichMotherNavButtonProps> = ({ 
    variant = 'header',
    onClick 
}) => {
    const location = useLocation();
    const isActive = location.pathname === '/rich-mother';

    const handleClick = () => {
        if (onClick) {
            onClick();
        } else {
            // Open Rich Mother in a new tab/window
            window.open('/RichMother/index.html', '_blank');
        }
    };

    return (
        <button
            className={clsx('rich-mother-nav-button', {
                'rich-mother-nav-button--header': variant === 'header',
                'rich-mother-nav-button--sidebar': variant === 'sidebar',
                'rich-mother-nav-button--mobile': variant === 'mobile',
                'active': isActive,
            })}
            onClick={handleClick}
            title="💎 Advanced Trading Tool"
        >
            <span className="button-icon">💎</span>
            {isActive && <div className="active-indicator" />}
        </button>
    );
};