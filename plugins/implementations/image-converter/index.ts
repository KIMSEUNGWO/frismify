import {ModalPlugin} from "@/types";

export const imageConverter: ModalPlugin = {
    id: 'image-converter',
    name: 'Image Converter',
    description: '이미지 파일 형식을 일괄 변환합니다.',
    category: 'utility',
    tier: 'free',
    version: '1.0.0',
    isModal: true,
    icon: (container) => {
        container.style.background = 'linear-gradient(135deg, #FB923C, #FDE047)';
        container.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="3" y="3" width="18" height="18" rx="2" stroke="white" stroke-width="2"/>
                <circle cx="8.5" cy="8.5" r="1.5" fill="white"/>
                <path d="M3 15L8 10L12 14L16 10L21 15V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V15Z" fill="white" opacity="0.7"/>
                <path d="M16 7L19 10M19 10L16 13M19 10H14" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
        `;
    }
}