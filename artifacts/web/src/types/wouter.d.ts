declare module 'wouter' {
    export function useLocation(): [string, (to: string, options?: { replace?: boolean; state?: any }) => void];
    export function Route(props: any): any;
    export function Switch(props: any): any;
    export function Router(props: any): any;
}
