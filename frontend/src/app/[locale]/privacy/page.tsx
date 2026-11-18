import { legalRoute } from '@/content/legal';

const route = legalRoute('privacy');

export const generateMetadata = route.generateMetadata;
export default route.Page;
