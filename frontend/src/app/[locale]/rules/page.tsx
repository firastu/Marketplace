import { legalRoute } from '@/content/legal';

const route = legalRoute('rules');

export const generateMetadata = route.generateMetadata;
export default route.Page;
