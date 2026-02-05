import { standalone_routes } from '@/components/shared';
import { useDevice } from '@deriv-com/ui';
import './app-logo.scss';

export const AppLogo = () => {
    const { isDesktop } = useDevice();

    if (!isDesktop) return null;
    return (
        <a
            href='https://www.tradermaster.site/'
            target='_blank'
            rel='noopener noreferrer'
            className='app-header__logo tradermaster-logo'
        >
            <span className='tradermaster-text'>TRADER MASTER</span>
        </a>
    );
};
