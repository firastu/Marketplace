import { legalRoute } from '@/content/legal';

const route = legalRoute('terms');

export const generateMetadata = route.generateMetadata;
export default route.Page;
