
import { useMemo } from 'react';

export const useUrlParams = () => {
    const params = useMemo(() => {
        const urlParams = new URLSearchParams(window.location.search);
        return {
            uid: urlParams.get('uid'),
            groupId: urlParams.get('group'),
            sectionId: urlParams.get('section'),
        };
    }, []);

    return params;
};
