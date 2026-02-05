import { useEffect, useState } from 'react';
import { Loader } from '@deriv-com/ui';

interface ChunkLoaderProps {
    message: string;
    minDisplayTime?: number;
}

export default function ChunkLoader({ message, minDisplayTime = 0 }: ChunkLoaderProps) {
    const [showContent, setShowContent] = useState(minDisplayTime === 0);

    useEffect(() => {
        if (minDisplayTime > 0) {
            const timer = setTimeout(() => {
                setShowContent(true);
            }, minDisplayTime);

            return () => clearTimeout(timer);
        }
    }, [minDisplayTime]);

    return (
        <div className='app-root'>
            <Loader />
            <div className='load-message'>{message}</div>
        </div>
    );
}
