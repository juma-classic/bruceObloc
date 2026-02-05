import { ComponentProps, ReactNode } from 'react';
import Livechat from '@/components/chat/Livechat';
import useIsLiveChatWidgetAvailable from '@/components/chat/useIsLiveChatWidgetAvailable';
import { TickSpeedNavButton } from '@/components/navigation/TickSpeedNavButton';
import { PatelSignalCenterNavButton } from '@/components/navigation/PatelSignalCenterNavButton';
import { PatelSignalsNavButton } from '@/components/navigation/PatelSignalsNavButton';
import { SpeedBotNavButton } from '@/components/navigation/SpeedBotNavButton';
import { DTraderManualNavButton } from '@/components/navigation/DTraderManualNavButton';
import { useOauth2 } from '@/hooks/auth/useOauth2';
import useRemoteConfig from '@/hooks/growthbook/useRemoteConfig';
import { useIsIntercomAvailable } from '@/hooks/useIntercom';
import useThemeSwitcher from '@/hooks/useThemeSwitcher';
import RootStore from '@/stores/root-store';
import { LegacyLogout1pxIcon, LegacyTheme1pxIcon, LegacyWhatsappIcon } from '@deriv/quill-icons/Legacy';
import { BrandDerivLogoCoralIcon } from '@deriv/quill-icons/Logo';
import { useTranslations } from '@deriv-com/translations';
import { ToggleSwitch } from '@deriv-com/ui';

export type TSubmenuSection = 'accountSettings' | 'cashier';

//IconTypes
type TMenuConfig = {
    LeftComponent: ReactNode | React.ElementType;
    RightComponent?: ReactNode;
    as: 'a' | 'button';
    href?: string;
    label: ReactNode;
    onClick?: () => void;
    removeBorderBottom?: boolean;
    submenu?: TSubmenuSection;
    target?: ComponentProps<'a'>['target'];
}[];

const useMobileMenuConfig = (client?: RootStore['client']) => {
    const { localize } = useTranslations();
    const { is_dark_mode_on, toggleTheme } = useThemeSwitcher();

    const { oAuthLogout } = useOauth2({ handleLogout: async () => client?.logout(), client });

    const { data } = useRemoteConfig(true);
    const { cs_chat_whatsapp } = data;

    const { is_livechat_available } = useIsLiveChatWidgetAvailable();
    const icAvailable = useIsIntercomAvailable();

    const menuConfig: TMenuConfig[] = [
        [
            {
                as: 'a',
                href: 'https://mesoflix.online',
                label: localize('mesoflix.online'),
                LeftComponent: BrandDerivLogoCoralIcon,
            },
            {
                as: 'button',
                label: <span className='theme-label'>{is_dark_mode_on ? '🌙 Dark Mode' : '☀️ Light Mode'}</span>,
                LeftComponent: LegacyTheme1pxIcon,
                RightComponent: <ToggleSwitch value={is_dark_mode_on} onChange={toggleTheme} />,
            },
        ],
        [
            {
                as: 'button',
                label: <TickSpeedNavButton variant='mobile' />,
                LeftComponent: () => null,
                onClick: () => {}, // Navigation handled by the button itself
            },
            {
                as: 'button',
                label: <PatelSignalsNavButton variant='mobile' />,
                LeftComponent: () => null,
                onClick: () => {}, // Navigation handled by the button itself
            },
            {
                as: 'button',
                label: <PatelSignalCenterNavButton variant='mobile' />,
                LeftComponent: () => null,
                onClick: () => {}, // Navigation handled by the button itself
            },
            {
                as: 'button',
                label: <SpeedBotNavButton variant='mobile' />,
                LeftComponent: () => null,
                onClick: () => {}, // Navigation handled by the button itself
            },
            {
                as: 'button',
                label: <DTraderManualNavButton />,
                LeftComponent: () => null,
                onClick: () => {}, // Navigation handled by the button itself
            },
        ],
        (
            [
                cs_chat_whatsapp
                    ? {
                          as: 'a',
                          href: 'https://wa.link/2xcwcb',
                          label: localize('WhatsApp'),
                          LeftComponent: LegacyWhatsappIcon,
                          target: '_blank',
                      }
                    : null,
                is_livechat_available || icAvailable
                    ? {
                          as: 'button',
                          label: localize('Live chat'),
                          LeftComponent: Livechat,
                          onClick: () => {
                              icAvailable ? window.Intercom('show') : window.LiveChatWidget?.call('maximize');
                          },
                      }
                    : null,
            ] as TMenuConfig
        ).filter(Boolean),
        client?.is_logged_in
            ? [
                  {
                      as: 'button',
                      label: localize('Log out'),
                      LeftComponent: LegacyLogout1pxIcon,
                      onClick: oAuthLogout,
                      removeBorderBottom: true,
                  },
              ]
            : [],
    ];

    return {
        config: menuConfig,
    };
};

export default useMobileMenuConfig;
