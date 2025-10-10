declare module 'react' {
  export const useEffect: any;
  export const useState: any;
  const React: any;
  export default React;
}

declare module 'react-dom/client' {
  export function createRoot(node: any): any;
}
