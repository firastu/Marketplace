import { legalRoute } from '@/content/legal';

const route = legalRoute('imprint');

export const generateMetadata = route.generateMetadata;
export default route.Page;
