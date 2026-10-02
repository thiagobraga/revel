import type { OptimisticOperation } from '../types/ui';
export async function runOptimistic<T>({ apply, revert, request }: OptimisticOperation<T>): Promise<T> {
    apply();
    try {
        return await request();
    }
    catch (error) {
        revert();
        throw error;
    }
}
